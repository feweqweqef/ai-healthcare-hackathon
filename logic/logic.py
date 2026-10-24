'''
Rules logic for the prescibing check
AI reads the notes -> this file decides -> doctor confirms.
Input : a dict of answers, e.g. {"smoking": "under_35", "migraine_aura": None, ...}
        None means "not mentioned in the notes" (NOT the same as "no").
Output: a dict with status, reasons, followups, still_to_ask, disagreements.

'''

import pandas as pd

# Set files to variables 
RULES_FILE = "rules.csv"
CONTRA_FILE = "mycrogynon30_contradiction.csv"
INTERACT_FILE = "mircogynon30_interactions.csv"    

# Load CSV files
def read_csv(path):
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    return df.apply(lambda col: col.str.strip()) # reads file,  will keep every column as text and doesnt read N/A as missing

# since categories are text change integer text into a literal integer
def to_category(text):
    if text in ("", "NA"):
        return None
    return int(float(text)) # also compensates for floats

def build_lookup(df):
# builds a new dictionary where the key is the pair
 return {(r["field"], r["allowed_value"]): r for r in df.to_dict("records")}

# rules and contra become lookup keywords while interact stays a plain list of words 
rules = build_lookup(read_csv(RULES_FILE))
contra = build_lookup(read_csv(CONTRA_FILE))
interact = read_csv(INTERACT_FILE).to_dict("records")

FIELDS = sorted({f for f, _ in rules if f != "combination"})
ALLOWED = {f: sorted(v for ff, v in rules if ff == f) for f in FIELDS}

# Values that count as a heart/clot risk factor for the "combination" rule
RISK_VALUES = {
    "smoking": {"under_35", "35plus_under_15", "35plus_15_plus", "35plus_stopped_under_1yr"},
    "diabetes": {"non_vascular", "with_complications", "other_vascular_disease"},
    "high_bp": {"controlled_hypertension", "stage_1", "stage_2_or_3", "vascular_disease"},
    "bmi": {"30_to_34.9", "35_plus"},
}

def colour_from_category(cat):
    if cat is None:
        return None
    return "red" if cat >= 4 else "amber" if cat == 3 else "green"
 
 
def colour_from_effect(effect):
    return {"contraindicated": "red", "doctor_to_confirm": "amber"}.get(effect)
 
 
WORST = {"green": 0, "amber": 1, "red": 2}
 
 
def worst(colours):
    colours = [c for c in colours if c]
    return max(colours, key=WORST.get) if colours else None
 
 
def combination_applies(answers):
    count = sum(1 for f, bad in RISK_VALUES.items() if answers.get(f) in bad)
    return count >= 2
 
 
def match_interactions(medicines):
    """medicines = list of drug names (the AI maps messy notes to these)."""
    found = []
    for med in medicines or []:
        m = med.lower().strip()
        for row in interactions:
            name = row["interacting_drug_or_class"].split(" (")[0].lower()
            if name.startswith(("any other", "laboratory", "other ")):
                continue  # generic rows are added separately
            if m in name or name in m:
                found.append(row)
    return found
 

