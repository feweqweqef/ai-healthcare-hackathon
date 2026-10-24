const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.post("/api/extract", async (req, res) => {
  try {
    const notes = req.body?.notes;

    if (typeof notes !== "string" || !notes.trim()) {
      return res.status(400).json({
        error: "Please provide fictional consultation notes."
      });
    }

    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:3b",
        stream: false,
        format: "json",
        options: { temperature: 0 },
        messages: [
          {
            role: "system",
            content: `Extract facts only from the fictional consultation notes.
Return valid JSON with exactly this structure:
{
  "migraine_aura": {"value": null, "evidence": ""},
  "smoker": {"value": null, "evidence": ""},
  "bp": {"systolic": null, "diastolic": null, "evidence": ""},
  "family_clots": {"value": null, "evidence": ""},
  "breast_cancer": {"value": null, "evidence": ""},
  "diabetes": {"value": null, "evidence": ""},
  "allergies": {"value": null, "evidence": ""},
  "other_meds": {"value": null, "evidence": ""}
}
For yes/no fields, use "yes" or "no" only when explicitly supported.

- Use null only when the notes do not provide enough information.
- Do not treat missing information as "no".

Examples:
- "She has no history of breast cancer" means breast_cancer = "no".
- "She has breast cancer" means breast_cancer = "yes".
- "She has no diabetes" means diabetes = "no".
- "She has diabetes" means diabetes = "yes".
- "She takes no regular medication" means other_meds = "no".
- "She takes carbamazepine" means other_meds = "yes".
- "She does not smoke" means smoker = "no".
- "She smokes 10 cigarettes a day" means smoker = "yes".
- "She has migraine with visual aura" means migraine_aura = "yes".
- "She has migraine but no aura" means migraine_aura = "no".
- "No family history of blood clots" means family_clots = "no".
- "Her mother had a DVT" means family_clots = "yes".
- "No known allergies" means allergies = "no" for this prototype's general allergy question.


Evidence must be a short, exact quotation from the note, or "" if unknown.
For blood pressure, use numeric systolic and diastolic values, or null if not stated.
Do not infer missing facts or make clinical decisions.
Do not treat missing information as "no".
Return only the requested JSON.
`
          },
          {
            role: "user",
            content: notes.trim()
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const extracted = JSON.parse(data.message.content);

    const fields = [
      "migraine_aura",
      "smoker",
      "family_clots",
      "breast_cancer",
      "diabetes",
      "allergies",
      "other_meds"
    ];

    const result = {};

    for (const field of fields) {
      const item = extracted[field];
      const value =
        item && ["yes", "no"].includes(item.value)
          ? item.value
          : null;

      result[field] = {
        value,
        evidence:
          value && typeof item.evidence === "string"
            ? item.evidence
            : ""
      };
    }

    const bp = extracted.bp || {};
    const systolic = Number.isInteger(bp.systolic)
      ? bp.systolic
      : null;
    const diastolic = Number.isInteger(bp.diastolic)
      ? bp.diastolic
      : null;

    result.bp = {
      systolic,
      diastolic,
      evidence:
        systolic !== null &&
        diastolic !== null &&
        typeof bp.evidence === "string"
          ? bp.evidence
          : ""
    };

    res.json(result);
  } catch (error) {
    console.error("Extraction error:", error.message);

    res.status(500).json({
      error:
        "Could not extract facts. Check that Ollama is running and qwen2.5:3b is installed."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Hackathon prototype only. Use fictional notes.");
});