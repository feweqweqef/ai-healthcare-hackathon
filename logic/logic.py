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


    

