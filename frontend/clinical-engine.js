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


// checkInteraction()


//FUNCTION: RECIEVES LISTS OF MEDICATION NAMES
function checkInteractions(patientMedications, clinicalRules) {
    const findings = [];

    if (!Array.isArray(patientMedications)) {
        return findings;
    }

    for (const medication of patientMedications) {
        if (typeof medication !== "string" || !medication.trim()) {
            continue;
        }

        const normalizedMedication = medication.trim().toLowerCase();

        const matches = clinicalRules.interactions.filter(rule => {
            const interaction = rule.interacting_drug_or_class
                .toLowerCase()
                .trim();

            // Match the medication name, not just any partial word.
            const interactionName = interaction.split(" (")[0].trim();

            return normalizedMedication === interactionName;
        });

        for (const rule of matches) {
            findings.push({
                medication,
                effect: rule.effect,
                advice: rule.advice,
                source: rule.source
            });
        }
    }

    return findings;
}




// mod exports
module.exports = {
    loadClinicalRules,
    checkUkMecRules,
    checkContraindications,
    checkInteractions
};