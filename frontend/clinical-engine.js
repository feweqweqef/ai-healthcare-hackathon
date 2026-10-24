const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const RULES_DIR = path.join(__dirname, "..", "rules");

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

function loadClinicalRules() {
    return {
        ukmecRules: loadCsv("rules.csv"),
        contraindications: loadCsv("mycrogynon30_contradiction.csv"),
        interactions: loadCsv("mircogynon30_interactions.csv")
    };
}


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