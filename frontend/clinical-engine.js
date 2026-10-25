/* THIS FILE ACTS LIKE A SEPERATE RULE ENGINE THAT COMPARES DOCTOR'S CONFIRMED NOTES 
AGAINST STRUCTURAL CLINICAL RULES UNDER THE UKMEC - UK Medical Eligibility Criteria for Contraceptive Use*/

/*IT PROVIDES CLASSIFICATIONS FOR WHETHER PARTICULAR CONTRACEPTIVE METHODS ARE MEDICALLY APPROPRIATE FOR PEOPLE
WITH SPECIFIC MEDICAL CONDITIONS

THERE ARE 4 CLASSIFICATIONS UNDER RULES, CAT 1 - 4; 1 MEANING NO RESTRICTION AND 4 BEING AN UNACCEPTABLE HEALTH
RISK - WE DIVIDE 1 INTO GREEN, 2 & 3 INTO AMBER & 4 INTO RED*/ 


// READING OUR CSV FILES 
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const RULES_DIR = path.join(__dirname, "..", "rules");


// FUNCTION: FINDS FILE, CHECKS IT EXISTS, READS THE CSV, PARSES TEXT
function loadCsv(filename) {
    const filePath = path.join(RULES_DIR, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf8");

    return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
    });
}



// FUNCTION: LOADS ALL 3 RULE SETS 
function loadClinicalRules() {
    return {
        ukmecRules: loadCsv("rules.csv"),
        contraindications: loadCsv("mycrogynon30_contradiction.csv"),
        interactions: loadCsv("mircogynon30_interactions.csv")
    };
}





// FUNCTION: UKMEC LOOKUP
/*HOW IT WORKS:
1. CREATES AN EMPTY FINDINGS LIST 
2. EXAMINE EACH PATIENT FACT
3. MATCH THE FIELD AND THE VALUE 
4. RETURN THE MATCHING RULE'S INFORMATION
5. RETURNS FINDINGS
*/
function checkUkMecRules(patientFacts, clinicalRules) {
    const findings = [];

    for (const [field, allowedValue] of Object.entries(patientFacts)) {
        if (allowedValue === null || allowedValue === undefined || allowedValue === "") {
            continue;
        }

        const matchingRules = clinicalRules.ukmecRules.filter(rule =>
            rule.field.trim().toLowerCase() === field.trim().toLowerCase() &&
            rule.allowed_value.trim().toLowerCase() === String(allowedValue).trim().toLowerCase()
        );

        for (const rule of matchingRules) {
            findings.push({
                field: rule.field,
                value: rule.allowed_value,
                category: rule.category,
                reason: rule.reason,
                followup: rule.followup,
                source: rule.source
            });
        }
    }

    return findings;
}



// product-specific contraindication checks

//FUNCTION: 2 CHECKS: UKEMC & CONTRAINDICATION 
//the engine searches for the matching field and value in the contraindication CSV.
function checkContraindications(patientFacts, clinicalRules) {
    const findings = [];

    for (const [field, allowedValue] of Object.entries(patientFacts)) {
        if (allowedValue === null || allowedValue === undefined || allowedValue === "") {
            continue;
        }

        const matchingRules = clinicalRules.contraindications.filter(rule =>
            rule.field.trim().toLowerCase() === field.trim().toLowerCase() &&
            rule.allowed_value.trim().toLowerCase() === String(allowedValue).trim().toLowerCase()
        );

        for (const rule of matchingRules) {
            findings.push({
                drug: rule.drug,
                method: rule.method,
                field: rule.field,
                value: rule.allowed_value,
                effect: rule.effect,
                reason: rule.reason,
                followup: rule.followup,
                source: rule.source
            });
        }
    }

    return findings;
}


/* ==========================================================
   INTERACTION CHECK
   ----------------------------------------------------------
   Old way: split the box into items, and each item had to equal
   a CSV name exactly. Almost everything missed.

   New way: for every CSV row, ask "does any name for this drug
   appear ANYWHERE in the text the doctor typed?"
   So "Carbamazepine 200mg" and "She takes carbamazepine" both match.
   ========================================================== */

// Extra names for CSV rows whose name can't be matched directly.
// KEYS must be the CSV name, lowercased, with anything after " (" removed.
const ALIASES = {
    "barbiturates incl. phenobarbitone": ["barbiturate", "phenobarbitone", "phenobarbital"],
    "etoricoxib 60-120 mg/day": ["etoricoxib", "arcoxia"],
    "ombitasvir/paritaprevir/ritonavir with dasabuvir": ["ombitasvir", "paritaprevir", "dasabuvir", "viekirax", "exviera"],
    "glecaprevir/pibrentasvir": ["glecaprevir", "pibrentasvir", "maviret"],
    "sofosbuvir/velpatasvir/voxilaprevir": ["voxilaprevir", "vosevi"],
    "st john's wort": ["st john", "hypericum"],
    "ciclosporin": ["cyclosporin", "cyclosporine"]
};

// Generic CSV rows that aren't real drug names, so we never text-match them.
const SKIP = new Set([
    "any other medicine",
    "laboratory tests",
    "other antiretrovirals"
]);

// lowercase, curly apostrophes -> straight, collapse spaces
function normalise(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/[’‘`]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

// All the names we should look for in the text for one CSV row.
function namesFor(rule) {
    const base = normalise(String(rule.interacting_drug_or_class || "").split(" (")[0]);

    if (!base || SKIP.has(base)) return [];

    const extra = (ALIASES[base] || []).map(normalise);

    // Combo rows (hep C regimens, "mg/day" rows) only match on their aliases,
    // otherwise plain "ritonavir" would trigger the hep C row.
    const isCombo = base.includes("/") || base.includes(" with ");

    return isCombo ? extra : [base, ...extra];
}

// Returns { findings, unmatchedMedications }
// unmatchedMedications = things the doctor typed that matched no rule,
// so we never silently treat "not on our list" as "no interaction".
function checkInteractions(medicationText, clinicalRules) {
    const text = normalise(medicationText);
    const findings = [];
    const unmatchedMedications = [];

    if (!text) return { findings, unmatchedMedications };

    const seen = new Set();

    // 1. Which rules match anywhere in the text?
    for (const rule of clinicalRules.interactions) {
        const hit = namesFor(rule).some(name => text.includes(name));

        if (hit) {
            const medication = String(rule.interacting_drug_or_class).split(" (")[0];

            if (seen.has(medication)) continue;
            seen.add(medication);

            findings.push({
                medication,
                effect: rule.effect,
                advice: rule.advice,
                source: rule.source
            });
        }
    }

    // 2. Which typed items matched nothing?
    const items = text
        .split(/[,;\n]+|\band\b/)
        .map(s => s.trim())
        .filter(Boolean);

    for (const item of items) {
        const matched = clinicalRules.interactions.some(rule =>
            namesFor(rule).some(name => item.includes(name))
        );

        if (!matched) unmatchedMedications.push(item);
    }

    return { findings, unmatchedMedications };
}




// mod exports
module.exports = {
    loadClinicalRules,
    checkUkMecRules,
    checkContraindications,
    checkInteractions
};