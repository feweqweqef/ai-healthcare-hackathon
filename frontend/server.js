const express = require("express");

const {
  loadClinicalRules,
  checkUkMecRules,
  checkContraindications,
  checkInteractions
} = require("./clinical-engine");

const app = express();
const PORT = 3000;
const clinicalRules = loadClinicalRules();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function makeField(value = null, evidence = "") {
  return { value, evidence };
}

function getEvidence(notes, patterns) {
  for (const pattern of patterns) {
    const match = notes.match(pattern);
    if (match) return match[0];
  }
  return "";
}

function correctExplicitNegative(extracted, notes, field, patterns) {
  const evidence = getEvidence(notes, patterns);
  if (!evidence) return;

  // Do not silently override contradictory information.
  if (extracted[field]?.value === "yes") {
    console.warn(`Conflicting evidence for ${field}. Please review manually.`);
    return;
  }

  extracted[field] = makeField("no", evidence);
}

function correctExplicitPositive(extracted, notes, field, patterns) {
  const evidence = getEvidence(notes, patterns);
  if (!evidence) return;

  if (extracted[field]?.value === "no") {
    console.warn(`Conflicting evidence for ${field}. Please review manually.`);
    return;
  }

  extracted[field] = makeField("yes", evidence);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractNumericFallbacks(notes, extracted) {
  const patterns = {
    age: [
      /\bage\s*[:\-]?\s*(\d{1,3})\b/i,
      /\b(\d{1,3})\s*[- ]year[- ]old\b/i
    ],

    height_cm: [
      /\bheight\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*cm\b/i,
      /\bheight\s*[:\-]?\s*(\d(?:\.\d+)?)\s*(?:m|metres?|meters?)\b/i
    ],

    weight_kg: [
      /\bweight\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*kg\b/i,
      /\b(\d{1,3}(?:\.\d+)?)\s*(?:kilograms?|kgs?)\b/i
    ],

    cigarettes_per_day: [
      /\b(?:smokes?|smoking)\s+(?:approximately\s+|about\s+|around\s+)?(\d{1,3})\s+cigarettes?\s+(?:a|per)\s+day\b/i,
      /\b(\d{1,3})\s+cigarettes?\s+(?:a|per)\s+day\b/i
    ]
  };

  for (const [key, fieldPatterns] of Object.entries(patterns)) {
    const existing = extracted[key];
    const existingValue =
      existing && typeof existing === "object"
        ? existing.value
        : existing;

    // Keep a value already extracted by the AI.
    if (
      existingValue !== null &&
      existingValue !== undefined &&
      existingValue !== ""
    ) {
      continue;
    }

    for (const pattern of fieldPatterns) {
      const match = notes.match(pattern);
      if (!match) continue;

      let value = Number(match[1]);

      // Convert metres to centimetres only when metres are explicitly stated.
      if (
        key === "height_cm" &&
        /\b(?:m|metres?|meters?)\b/i.test(match[0]) &&
        !/\bcm\b/i.test(match[0])
      ) {
        value *= 100;
      }

      if (Number.isFinite(value)) {
        extracted[key] = makeField(value, match[0]);
        break;
      }
    }
  }

  // Convert pounds to kilograms only when pounds are explicitly stated.
  if (extracted.weight_kg?.value == null) {
    const pounds = notes.match(
      /\bweight\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/i
    );

    if (pounds) {
      extracted.weight_kg = makeField(
        Math.round(Number(pounds[1]) * 0.45359237 * 10) / 10,
        pounds[0]
      );
    }
  }
}

// ---- Evidence guard ----
// The AI must back every answer with a quote from the notes.
// If the quote is not really in the notes, we drop the answer so the
// doctor fills it in, instead of trusting an invented quote.
function normaliseForQuote(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\s]+/g, " ")
    .replace(/^[\s"'.,;:!?-]+|[\s"'.,;:!?-]+$/g, "")
    .trim();
}

function quoteIsInNotes(evidence, notes) {
  const quote = normaliseForQuote(evidence);
  if (!quote) return false;
  return normaliseForQuote(notes).includes(quote);
}

function dropUnsupportedAnswers(extracted, notes) {
  for (const [key, item] of Object.entries(extracted)) {
    if (!item || typeof item !== "object") continue;

    const hasValue =
      key === "bp"
        ? item.systolic != null || item.diastolic != null
        : item.value !== null && item.value !== undefined && item.value !== "";

    if (!hasValue) continue;

    if (!quoteIsInNotes(item.evidence, notes)) {
      console.warn(
        `Dropped "${key}": evidence not found in notes ->`,
        JSON.stringify(item.evidence)
      );

      if (key === "bp") {
        extracted.bp = { systolic: null, diastolic: null, evidence: "" };
      } else {
        extracted[key] = { value: null, evidence: "" };
      }
    }
  }
}


// 

app.post("/api/extract", async (req, res) => {
  try {
    const notes = req.body?.notes;

    if (typeof notes !== "string" || !notes.trim()) {
      return res.status(400).json({
        error: "Please provide fictional consultation notes."
      });
    }

    const cleanNotes = notes.trim();

    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model: "qwen2.5:3b",
        stream: false,
        format: "json",
        options: {
          temperature: 0
        },

        messages: [
          {
            role: "system",

            content: `Extract facts only from the fictional consultation notes.

Return valid JSON with exactly this structure:

{
  "age": {"value": null, "evidence": ""},
  "height_cm": {"value": null, "evidence": ""},
  "weight_kg": {"value": null, "evidence": ""},
  "cigarettes_per_day": {"value": null, "evidence": ""},
  "migraine_aura": {"value": null, "evidence": ""},
  "smoker": {"value": null, "evidence": ""},
  "bp": {"systolic": null, "diastolic": null, "evidence": ""},
  "personal_clots": {"value": null, "evidence": ""},
  "family_clots": {"value": null, "evidence": ""},
  "clotting_disorder": {"value": null, "evidence": ""},
  "major_surgery_immobilisation": {"value": null, "evidence": ""},
  "heart_or_stroke_history": {"value": null, "evidence": ""},
  "diabetes": {"value": null, "evidence": ""},
  "liver_disease": {"value": null, "evidence": ""},
  "breast_cancer": {"value": null, "evidence": ""},
  "hep_c_antivirals": {"value": null, "evidence": ""},
  "allergies": {"value": null, "evidence": ""},
  "other_meds": {"value": null, "evidence": ""}
}

EXTRACTION RULES:

1. Extract age, height, weight, cigarettes per day and blood pressure only when supported by the notes.

2. Return numeric values for age, height_cm, weight_kg, cigarettes_per_day, and blood pressure.

3. Convert metres to centimetres and pounds to kilograms only when the units are explicitly stated and conversion is unambiguous.

4. For yes/no fields, return "yes", "no", or null.

5. Missing information MUST remain null. Never assume something is absent just because the notes do not mention it.

6. Distinguish explicit negatives from missing information:
   - "No history of breast cancer" means breast_cancer = "no".
   - "No breast cancer history documented" means breast_cancer = null.
   - "No history of diabetes" means diabetes = "no".
   - "No diabetes mentioned" means diabetes = null.
   - "No known allergies" means allergies = "no".
   - "Not on any regular medicines" means other_meds = "no".
   - "She takes carbamazepine" means other_meds = "yes".
   - "She does not smoke" means smoker = "no".
   - "She smokes 10 cigarettes a day" means smoker = "yes".
   - "Migraine with visual aura" means migraine_aura = "yes".
   - "Migraine but no aura" means migraine_aura = "no".
   - "No family history of blood clots" means family_clots = "no".
   - "Her mother had a DVT" means family_clots = "yes".

7. Do not invent specific clinical details. For example, a generic "yes" must not be converted into a specific type of diabetes, liver disease, breast cancer or vascular disease.

8. Review every field independently. Do not skip fields near the end.

9. For every non-null answer, copy the exact supporting words from the notes into evidence. Evidence must be a short quotation. Use an empty string if no supporting evidence exists.

10. For blood pressure, return numeric systolic and diastolic values, or null when not stated.

11. Do not infer missing facts or make clinical decisions.

Return only the requested JSON.`
          },

          {
            role: "user",
            content: cleanNotes
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}`);
    }

    const data = await response.json();

    let extracted;

    try {
      extracted = JSON.parse(data.message.content);
    } catch {
      throw new Error("Ollama did not return valid JSON.");
    }

    if (!extracted || typeof extracted !== "object") {
      throw new Error("Ollama returned an unexpected response.");
    }

    // Recover clearly stated numeric facts if the AI missed them.
    extractNumericFallbacks(cleanNotes, extracted);

    // Explicit negatives: these do not infer anything from missing information.
    correctExplicitNegative(extracted, cleanNotes, "breast_cancer", [
      /\bno (?:personal )?history of breast cancer\b/i,
      /\b(?:denies|does not have) breast cancer\b/i
    ]);

    correctExplicitNegative(extracted, cleanNotes, "other_meds", [
      /\bnot (?:on|taking) any regular (?:medicines|medications|meds)\b/i,
      /\bno regular (?:medicines|medications|meds)\b/i,
      /\bdoes not take any (?:regular )?(?:medicines|medications|meds)\b/i
    ]);

    correctExplicitNegative(extracted, cleanNotes, "allergies", [
      /\bno known allergies\b/i,
      /\bno known drug allergies\b/i,
      /\bno known medication allergies\b/i
    ]);

    correctExplicitNegative(extracted, cleanNotes, "diabetes", [
      /\bno (?:personal )?history of diabetes\b/i,
      /\bdoes not have diabetes\b/i,
      /\bno diabetes\b/i
    ]);

    correctExplicitNegative(extracted, cleanNotes, "smoker", [
      /\bdoes not smoke\b/i,
      /\bdoesn't smoke\b/i,
      /\bnever smoked\b/i,
      /\bnon[- ]smoker\b/i
    ]);

    correctExplicitPositive(extracted, cleanNotes, "smoker", [
      /\bsmokes?\s+(?:approximately\s+|about\s+|around\s+)?\d{1,3}\s+cigarettes?\s+(?:a|per)\s+day\b/i,
      /\bsmoking\s+(?:approximately\s+|about\s+|around\s+)?\d{1,3}\s+cigarettes?\s+(?:a|per)\s+day\b/i
    ]);

    // Absence of a mention is not a confirmed negative.
    if (/\bno (?:history of )?diabetes mentioned\b/i.test(cleanNotes)) {
      extracted.diabetes = makeField(null, "");
    }

    // Drop any AI answer whose evidence quote is not actually in the notes.
    dropUnsupportedAnswers(extracted, cleanNotes);

    const result = {};

    // Numeric fields.
    for (const key of [
      "age",
      "height_cm",
      "weight_kg",
      "cigarettes_per_day"
    ]) {
      const item = extracted[key];
      const rawValue =
        item && typeof item === "object" ? item.value : item;

      const value = toNumber(rawValue);

      result[key] = {
        value,
        evidence:
          value !== null && typeof item?.evidence === "string"
            ? item.evidence
            : ""
      };
    }

    // Yes/no fields.
    for (const key of [
      "migraine_aura",
      "smoker",
      "family_clots",
      "breast_cancer",
      "diabetes",
      "allergies",
      "other_meds"
    ]) {
      const item = extracted[key];
      const rawValue =
        item && typeof item === "object" ? item.value : item;

      const value =
        typeof rawValue === "string" &&
        ["yes", "no"].includes(rawValue.toLowerCase())
          ? rawValue.toLowerCase()
          : null;

      result[key] = {
        value,
        evidence:
          value !== null && typeof item?.evidence === "string"
            ? item.evidence
            : ""
      };
    }

    // These categories need specific interpretation and manual confirmation.
    for (const key of [
      "personal_clots",
      "clotting_disorder",
      "major_surgery_immobilisation",
      "heart_or_stroke_history",
      "liver_disease",
      "hep_c_antivirals"
    ]) {
      const item = extracted[key];
      const rawValue =
        item && typeof item === "object" ? item.value : item;

      result[key] = {
        value: typeof rawValue === "string" ? rawValue : null,
        evidence:
          typeof item?.evidence === "string" ? item.evidence : ""
      };
    }

    const bp = extracted.bp || {};
    const systolic = toNumber(bp.systolic);
    const diastolic = toNumber(bp.diastolic);

    result.bp = {
      systolic: Number.isInteger(systolic) ? systolic : null,
      diastolic: Number.isInteger(diastolic) ? diastolic : null,
      evidence: typeof bp.evidence === "string" ? bp.evidence : ""
    };

    console.log("EXTRACTION RESULT:");
    console.log(JSON.stringify(result, null, 2));

    return res.json(result);

  } catch (error) {
    console.error("Extraction error:", error.message);

    return res.status(500).json({
      error: "Could not extract facts. Check that Ollama is running and qwen2.5:3b is installed."
    });
  }
});


// Check extracted answers against the CSV-based clinical rules.
// Hackathon prototype only — not a clinical decision or prescribing tool.
app.post("/api/check", (req, res) => {
  try {
    const answers = req.body.answers;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({
        error: "Expected an answers object."
      });
    }

    const facts = {};

    // Convert numeric inputs safely.
    const numberOrNull = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };

    const age = numberOrNull(answers.age);
    const height = numberOrNull(answers.height_cm);
    const weight = numberOrNull(answers.weight_kg);
    const systolic = numberOrNull(answers.bp_systolic);
    const diastolic = numberOrNull(answers.bp_diastolic);
    const cigarettes = numberOrNull(answers.cigarettes_per_day);

    // Age category.
    if (age !== null && age >= 0 && age < 40) {
      facts.age = "under_40";
    } else if (age !== null && age >= 40 && age <= 50) {
      facts.age = "40_to_50";
    }

    // BMI category.
    if (height !== null && height > 0 && weight !== null && weight > 0) {
      const bmi = weight / ((height / 100) ** 2);

      if (bmi < 30) facts.bmi = "under_30";
      else if (bmi < 35) facts.bmi = "30_to_34.9";
      else facts.bmi = "35_plus";
    }

    // Smoking category.
    const smokingStatus = answers.smoking_status;

    if (smokingStatus === "non_smoker") {
      facts.smoking = "non_smoker";
    } else if (age !== null && age < 35 &&
               smokingStatus === "current_smoker") {
      facts.smoking = "under_35";
    } else if (age !== null && age >= 35 &&
               smokingStatus === "current_smoker" &&
               cigarettes !== null && cigarettes >= 15) {
      facts.smoking = "35plus_15_plus";
    } else if (age !== null && age >= 35 &&
               smokingStatus === "current_smoker" &&
               cigarettes !== null && cigarettes >= 0 &&
               cigarettes < 15) {
      facts.smoking = "35plus_under_15";
    } else if (age !== null && age >= 35 &&
               smokingStatus === "stopped_under_1yr") {
      facts.smoking = "35plus_stopped_under_1yr";
    } else if (age !== null && age >= 35 &&
               smokingStatus === "stopped_1yr_plus") {
      facts.smoking = "35plus_stopped_1yr_plus";
    }

    // Migraine.
    if (answers.migraine_aura &&
        answers.migraine_aura !== "unknown") {
      facts.migraine_aura = answers.migraine_aura;
    }

    // Blood pressure.
    if (systolic !== null && diastolic !== null) {
      if (systolic >= 160 || diastolic >= 100) {
        facts.high_bp = "stage_2_or_3";
      } else if (systolic >= 140 || diastolic >= 90) {
        facts.high_bp = "stage_1";
      } else {
        facts.high_bp = "normal";
      }
    }

    // Map questionnaire answers to the values used in the CSVs.
    const directMappings = [
      "family_clots",
      "personal_clots",
      "clotting_disorder",
      "major_surgery_immobilisation"
    ];

    for (const field of directMappings) {
      if (answers[field] && answers[field] !== "unknown") {
        facts[field] = answers[field];
      }
    }

    // Any specified heart/stroke condition maps to the CSV category.
    if (answers.heart_or_stroke_history === "none") {
      facts.heart_or_stroke_history = "none";
    } else if (
      answers.heart_or_stroke_history &&
      answers.heart_or_stroke_history !== "unknown"
    ) {
      facts.heart_or_stroke_history = "current_or_history";
    }

    // Preserve only explicitly selected diabetes categories.
    if (answers.diabetes && answers.diabetes !== "unknown") {
      facts.diabetes = answers.diabetes;
    }

    if (answers.liver_disease && answers.liver_disease !== "unknown") {
      facts.liver_disease = answers.liver_disease;
    }

    if (answers.breast_cancer && answers.breast_cancer !== "unknown") {
      facts.breast_cancer = answers.breast_cancer;
    }

    // Allergy answers: a non-empty allergy description requires review.
    const allergyText = String(answers.allergies || "").trim();

    if (/^(no|none|no known allergies)$/i.test(allergyText)) {
      facts.allergies = "none";
    } else if (allergyText) {
      facts.allergies = "yes";
    }

    // Check whether the user reports hepatitis C antiviral treatment.
    if (answers.hep_c_antivirals === "yes") {
      facts.other_meds = "hep_c_antivirals";
    }

    // Identify required answers that are missing or unknown.
    const requiredFields = [
      "age",
      "height_cm",
      "weight_kg",
      "smoking_status",
      "migraine_aura",
      "bp_systolic",
      "bp_diastolic",
      "personal_clots",
      "family_clots",
      "clotting_disorder",
      "major_surgery_immobilisation",
      "heart_or_stroke_history",
      "diabetes",
      "liver_disease",
      "breast_cancer",
      "other_meds",
      "hep_c_antivirals",
      "allergies"
    ];

    const missingFields = requiredFields.filter(field => {
      const value = answers[field];

      return (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "unknown"
      );
    });

    // Cigarette count is required for current smokers aged 35+.
    if (
      smokingStatus === "current_smoker" &&
      age !== null &&
      age >= 35 &&
      cigarettes === null
    ) {
      missingFields.push("cigarettes_per_day");
    }

    // ---- Combined risk factors (UKMEC 2025, printed p.59) ----
    // UKMEC names these as examples of CVD risk factors: smoking, diabetes,
    // hypertension, obesity, dyslipidaemias. "Multiple" means MORE THAN ONE.
    // Dyslipidaemia is not asked in this form, and age is not named in that row.
    const riskFactors = [
      // smoking: current smoker, or stopped under 1 year ago (age 35+)
      ["under_35", "35plus_under_15", "35plus_15_plus", "35plus_stopped_under_1yr"]
        .includes(facts.smoking),
      // diabetes (any type that is not "none" or gestational-only)
      ["non_vascular", "with_complications", "other_vascular_disease"]
        .includes(facts.diabetes),
      // hypertension (stage 1 or above, from the BP reading)
      ["stage_1", "stage_2_or_3"].includes(facts.high_bp),
      // obesity (BMI 30 or above)
      ["30_to_34.9", "35_plus"].includes(facts.bmi)
    ].filter(Boolean).length;

    if (riskFactors >= 2) {
      facts.combination = "2_or_more_cvd_risk_factors";
    }

    // Run the CSV-based checks.
    const ukmecFindings = checkUkMecRules(facts, clinicalRules);
    const contraindicationFindings =
      checkContraindications(facts, clinicalRules);

    // ---- Interactions ----
    // The matcher looks for drug names anywhere in the text, so the doctor
    // can type "Carbamazepine 200mg" or "She takes carbamazepine".
    const medicationText = String(answers.other_meds || "").trim();

    // "No medicines" style answers: don't list them as "unrecognised".
    const noMedicationReported =
      /^(no|none|nil)\b/i.test(medicationText) ||
      /\bnot (?:on|taking) any\b/i.test(medicationText) ||
      /\bno regular (?:medicines|medications|meds)\b/i.test(medicationText);

    const {
      findings: interactionFindings,
      unmatchedMedications
    } = checkInteractions(medicationText, clinicalRules);

    const unmatched = noMedicationReported ? [] : unmatchedMedications;

    return res.json({
      facts,
      missingFields,
      ukmecFindings,
      contraindicationFindings,
      interactionFindings,
      unmatchedMedications: unmatched,
      prototypeOnly: true
    });

  } catch (error) {
    console.error("Clinical check error:", error);

    return res.status(500).json({
      error: "Unable to check the answers against the rules."
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Hackathon prototype only. Use fictional notes.");
});