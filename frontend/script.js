'use strict';

/* ==========================================================
   1. QUESTIONS
   ========================================================== */

const QUESTIONS = [
  { field: 'age', type: 'number', label: 'Age', hint: 'Age in years', min: 1, max: 120 },
  { field: 'height_cm', type: 'number', label: 'Height (cm)', hint: 'Height in centimetres', min: 50, max: 250 },
  { field: 'weight_kg', type: 'number', label: 'Weight (kg)', hint: 'Weight in kilograms', min: 2, max: 500 },

  {
    field: 'migraine_aura',
    type: 'select',
    label: 'Migraine history',
    hint: 'Select the option that best describes the patient',
    options: [
      ['none', 'No migraine'],
      ['without_aura', 'Migraine without aura'],
      ['with_aura', 'Migraine with aura'],
      ['aura_history_5plus_years', 'History of aura 5 or more years ago'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'smoking_status',
    type: 'select',
    label: 'Smoking status',
    hint: 'Ask about current and previous smoking',
    options: [
      ['non_smoker', 'Does not currently smoke'],
      ['current_smoker', 'Currently smokes'],
      ['stopped_under_1yr', 'Stopped less than 1 year ago'],
      ['stopped_1yr_plus', 'Stopped 1 year ago or longer'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'cigarettes_per_day',
    type: 'number',
    label: 'Cigarettes smoked per day',
    hint: 'For current smokers; enter 0 if none',
    min: 0,
    max: 200
  },
  {
    field: 'bp',
    type: 'bp',
    label: 'Blood pressure',
    hint: 'Enter the most recent reading, if available'
  },
  {
    field: 'personal_clots',
    type: 'select',
    label: 'Personal history of blood clots',
    hint: 'DVT means deep vein thrombosis; PE means pulmonary embolism',
    options: [
      ['none', 'No personal history of DVT or PE'],
      ['current_or_history', 'Current or previous DVT or PE'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'family_clots',
    type: 'select',
    label: 'Family history of blood clots',
    hint: 'Particularly a parent, sibling or child',
    options: [
      ['none', 'No known first-degree family history'],
      ['first_degree', 'A parent, sibling or child has had a blood clot'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'clotting_disorder',
    type: 'select',
    label: 'Known clotting disorder',
    hint: 'For example, Factor V Leiden',
    options: [
      ['none', 'No known clotting disorder'],
      ['known_inherited_or_acquired', 'Known inherited or acquired clotting disorder'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'major_surgery_immobilisation',
    type: 'select',
    label: 'Major surgery or prolonged immobilisation',
    hint: 'Ask about planned or recent major surgery involving prolonged immobility',
    options: [
      ['none', 'No relevant planned or recent surgery'],
      ['planned_or_recent', 'Planned or recent major surgery with prolonged immobilisation'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'heart_or_stroke_history',
    type: 'select',
    label: 'Heart disease or stroke history',
    hint: 'Include transient ischaemic attack (TIA)',
    options: [
      ['none', 'No known history'],
      ['ischaemic_heart_disease', 'Current or previous ischaemic heart disease'],
      ['stroke_or_tia', 'Current or previous stroke or TIA'],
      ['other_vascular_disease', 'Other heart or vascular disease'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'diabetes',
    type: 'select',
    label: 'Diabetes history',
    hint: 'Include any diabetes-related complications',
    options: [
      ['none', 'No diabetes'],
      ['gestational_history', 'History of gestational diabetes only'],
      ['non_vascular', 'Diabetes without known vascular complications'],
      ['with_complications', 'Diabetes with complications'],
      ['other_vascular_disease', 'Diabetes with other vascular disease'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'liver_disease',
    type: 'select',
    label: 'Liver disease history',
    hint: 'Select a known diagnosis, if applicable',
    options: [
      ['none', 'No known liver disease'],
      ['viral_hepatitis_acute', 'Acute viral hepatitis'],
      ['carrier_or_chronic', 'Chronic viral hepatitis or carrier status'],
      ['cirrhosis_mild', 'Mild cirrhosis'],
      ['cirrhosis_severe', 'Severe cirrhosis'],
      ['benign_tumour_fnh', 'Benign liver tumour / focal nodular hyperplasia'],
      ['adenoma_or_malignant', 'Liver adenoma or malignant liver tumour'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'breast_cancer',
    type: 'select',
    label: 'Breast cancer history',
    hint: 'Include personal history and any known BRCA mutation',
    options: [
      ['none', 'No personal history'],
      ['family_history_only', 'Family history only'],
      ['brca_carrier', 'Known BRCA mutation'],
      ['completed_treatment', 'Previous breast cancer; treatment completed'],
      ['current_treatment', 'Current breast cancer treatment'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'other_meds',
    type: 'text',
    label: 'Current medicines and supplements',
    hint: 'List names and doses if known, including non-prescription medicines'
  },
  {
    field: 'hep_c_antivirals',
    type: 'select',
    label: 'Hepatitis C antiviral medicines',
    hint: 'Ask specifically about current hepatitis C treatment',
    options: [
      ['yes', 'Yes'],
      ['no', 'No'],
      ['unknown', 'Not sure']
    ]
  },
  {
    field: 'allergies',
    type: 'text',
    label: 'Allergies',
    hint: 'List the substance and reaction, or enter "No known allergies" if confirmed'
  }
];


/* ==========================================================
   2. FICTIONAL TEST NOTES
   ========================================================== */

const EXAMPLE_NOTES = `FICTIONAL HACKATHON TEST PATIENT — NOT A REAL PATIENT.
Age 28. Height 165 cm. Weight 62 kg.
Wants to discuss the combined pill.
Smokes about 10 cigarettes a day. BP today 148/94.
Gets headaches with visual aura (zigzag lines) about once a month.
No personal history of DVT or PE. Mum had a DVT at 40.
No known clotting disorder. No planned or recent major surgery involving prolonged immobilisation.
No known history of ischaemic heart disease, stroke or TIA.
No history of diabetes. No known liver disease.
No history of breast cancer. Not on any regular medicines.
No current hepatitis C antiviral treatment. No known allergies.`;


/* ==========================================================
   3. AI EXTRACTION
   ========================================================== */

async function extractFromNotes(notes) {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ notes })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Extraction failed.');
  }

  return data;
}


/* ==========================================================
   4. DEMO RULES — NOT CLINICALLY VALIDATED
   ========================================================== */

function getResult(answers) {
  const rank = {
    green: 0,
    amber: 1,
    red: 2
  };

  let status = 'green';
  const reasons = [];

  const raise = (newStatus) => {
    if (rank[newStatus] > rank[status]) {
      status = newStatus;
    }
  };

  QUESTIONS.forEach((q) => {
    if (q.type === 'bp') {
      const systolic = answers.bp_systolic;
      const diastolic = answers.bp_diastolic;

      if (systolic == null || diastolic == null) {
        reasons.push(
          'Blood pressure has not been recorded. A clinician must assess this.'
        );
        raise('amber');
      } else if (systolic >= 160 || diastolic >= 100) {
        reasons.push(
          `Blood pressure entered: ${systolic}/${diastolic}. Requires clinician review (demo flag).`
        );
        raise('red');
      } else if (systolic >= 140 || diastolic >= 90) {
        reasons.push(
          `Blood pressure entered: ${systolic}/${diastolic}. Requires clinician review (demo flag).`
        );
        raise('amber');
      }

      return;
    }

    const value = answers[q.field];

    if (value == null || value === '' || value === 'unknown') {
      reasons.push(
        `${q.label}: not confirmed. Ask/check before any clinical decision.`
      );
      raise('amber');
      return;
    }

    if (
      q.field === 'migraine_aura' &&
      value === 'with_aura'
    ) {
      reasons.push(
        'Migraine with aura selected: requires qualified clinician review (demo flag).'
      );
      raise('red');

    } else if (
      q.field === 'breast_cancer' &&
      value === 'current_treatment'
    ) {
      reasons.push(
        'Current breast cancer treatment selected: requires qualified clinician review (demo flag).'
      );
      raise('red');

    } else if (
      q.field === 'personal_clots' &&
      value === 'current_or_history'
    ) {
      reasons.push(
        'Personal history of blood clots selected: requires qualified clinician review (demo flag).'
      );
      raise('red');

    } else if (
      q.field === 'clotting_disorder' &&
      value === 'known_inherited_or_acquired'
    ) {
      reasons.push(
        'Known clotting disorder selected: requires qualified clinician review (demo flag).'
      );
      raise('red');

    } else if (
      (q.field === 'smoking_status' && value !== 'non_smoker') ||
      (q.field === 'family_clots' && value === 'first_degree') ||
      (q.field === 'major_surgery_immobilisation' && value === 'planned_or_recent') ||
      (q.field === 'heart_or_stroke_history' && value !== 'none') ||
      (q.field === 'diabetes' &&
        ['with_complications', 'other_vascular_disease'].includes(value)) ||
      (q.field === 'liver_disease' &&
        [
          'viral_hepatitis_acute',
          'cirrhosis_severe',
          'adenoma_or_malignant'
        ].includes(value)) ||
      (q.field === 'breast_cancer' &&
        ['brca_carrier', 'completed_treatment'].includes(value)) ||
      (q.field === 'hep_c_antivirals' && value === 'yes')
    ) {
      reasons.push(
        `${q.label}: selected answer needs clinician review (demo flag).`
      );
      raise('amber');
    }
  });

  if (reasons.length === 0) {
    reasons.push('No flags found by the placeholder demo rules.');
  }

  return {
    status,
    reasons,
    followups: [
      'Confirm the recorded answers with the patient.',
      'Check relevant official guidance and product information.',
      'A qualified clinician must make any prescribing decision.'
    ]
  };
}


/* ==========================================================
   5. PATIENT-FACING WORDING — PLACEHOLDER
   ========================================================== */

const PATIENT_WORDING = {
  migraine_aura:
    'You have provided information about migraine history that needs to be discussed with a clinician.',
  smoking_status:
    'You have provided information about smoking history.',
  family_clots:
    'You have reported a close relative with a blood clot.',
  personal_clots:
    'You have reported a personal history of blood clots.',
  clotting_disorder:
    'You have reported a clotting disorder.',
  major_surgery_immobilisation:
    'You have reported planned or recent major surgery with prolonged immobility.',
  heart_or_stroke_history:
    'You have provided information about a heart, stroke or vascular history.',
  diabetes:
    'You have provided information about diabetes history.',
  liver_disease:
    'You have provided information about liver disease history.',
  breast_cancer:
    'You have provided information about breast cancer history.',
  hep_c_antivirals:
    'You have provided information about hepatitis C antiviral treatment.',
  allergies:
    'Please ensure any reported allergies and reactions are checked.',
  other_meds:
    'Your medicines and supplements should be checked for interactions.'
};

const SHEET_TEXT = {
  red: {
    heading: 'Your answers need a clinician’s review',
    next: [
      'A qualified clinician will discuss suitable options with you.',
      'This prototype cannot determine whether the combined pill is appropriate.'
    ]
  },

  amber: {
    heading: 'Some information needs checking',
    next: [
      'A qualified clinician will review these points with you.',
      'This prototype cannot determine whether the combined pill is appropriate.'
    ]
  },

  green: {
    heading: 'No flags found by the demo questions',
    next: [
      'A qualified clinician will explain the options available to you.',
      'This prototype does not cover every factor needed for a prescribing decision.'
    ]
  }
};

const STATUS_TEXT = {
  red: {
    title: 'Needs clinician review',
    summary: 'A demo rule flagged at least one answer. This is not a clinical decision.'
  },

  amber: {
    title: 'Needs a closer look',
    summary: 'Some answers need checking. These are placeholder demo rules only.'
  },

  green: {
    title: 'No demo flags found',
    summary: 'This does not mean the combined pill is clinically suitable.'
  }
};


/* ==========================================================
   6. PAGE STATE
   ========================================================== */

const $ = (id) => document.getElementById(id);

const SCREENS = [
  'notes',
  'answers',
  'result',
  'sheet'
];

const state = {
  extracted: false,
  answers: {},
  bp: {},
  result: null,
  confirmedOn: null
};

const rowRefs = {};

function emptyAnswer(value = null, evidence = null) {
  return {
    value,
    aiValue: value,
    evidence
  };
}

function freshState() {
  state.extracted = false;
  state.result = null;
  state.confirmedOn = null;
  state.answers = {};

  QUESTIONS.forEach((q) => {
    if (q.type !== 'bp') {
      state.answers[q.field] = emptyAnswer(
        q.type === 'text' || q.type === 'number'
          ? ''
          : null
      );
    }
  });

  state.bp = {
    systolic: null,
    diastolic: null,
    aiSystolic: null,
    aiDiastolic: null,
    evidence: null
  };

  Object.keys(rowRefs).forEach((key) => {
    delete rowRefs[key];
  });
}


/* ==========================================================
   7. SCREEN SWITCHING
   ========================================================== */

function go(name) {
  SCREENS.forEach((screen) => {
    const element = $(`screen-${screen}`);

    if (element) {
      element.hidden = screen !== name;
    }
  });

  const currentIndex = SCREENS.indexOf(name);

  document.querySelectorAll('#stepper li').forEach((li) => {
    const index = SCREENS.indexOf(li.dataset.step);

    li.classList.toggle('done', index < currentIndex);

    if (index === currentIndex) {
      li.setAttribute('aria-current', 'step');
    } else {
      li.removeAttribute('aria-current');
    }
  });

  window.scrollTo({ top: 0 });

  const headings = {
    notes: 'notesTitle',
    answers: 'answersTitle',
    result: 'resultTitle',
    sheet: 'sheetTitle'
  };

  const heading = $(headings[name]);

  if (heading) {
    heading.focus({ preventScroll: true });
  }
}


/* ==========================================================
   8. SCREEN 1 — CONSULTATION NOTES
   ========================================================== */

$('useExample').addEventListener('click', () => {
  $('notes').value = EXAMPLE_NOTES;
  $('readStatus').textContent = '';
});

$('readNotes').addEventListener('click', async () => {
  const notes = $('notes').value.trim();
  const status = $('readStatus');

  if (!notes) {
    status.textContent =
      'Paste fictional test notes first, or use the example notes.';
    return;
  }

  const button = $('readNotes');
  button.disabled = true;

  status.textContent = 'Reading the notes with the local AI…';

  try {
    const found = await extractFromNotes(notes);

    applyExtraction(found);

    status.textContent = '';

    renderAnswers();
    go('answers');

  } catch (error) {
    console.error(error);

    status.textContent =
      'Could not read the notes. Check that the server and Ollama are running, or fill in the answers by hand.';

  } finally {
    button.disabled = false;
  }
});

$('skipNotes').addEventListener('click', () => {
  freshState();
  renderAnswers();
  go('answers');
});


/* ==========================================================
   9. APPLY AI EXTRACTION
   ========================================================== */

function setExtracted(fieldName, value, evidence = null) {
  if (!Object.prototype.hasOwnProperty.call(state.answers, fieldName)) {
    return;
  }

  state.answers[fieldName] = {
    value,
    aiValue: value,
    evidence: typeof evidence === 'string' ? evidence : null
  };
}

function itemValue(item) {
  return item && typeof item === 'object'
    ? item.value
    : item;
}

function itemEvidence(item) {
  return item &&
    typeof item === 'object' &&
    typeof item.evidence === 'string'
      ? item.evidence
      : '';
}

function applyExtraction(found) {
  const notes = $('notes').value;

  // Age fallback: supports "age 28", "age: 28", and "28-year-old".
  const ageMatch = notes.match(
    /\bage\s*[:\-]?\s*(\d{1,3})\b|\b(\d{1,3})\s*[- ]year[- ]old\b/i
  );

  if (itemValue(found?.age) == null && ageMatch) {
    found.age = {
      value: Number(ageMatch[1] || ageMatch[2]),
      evidence: ageMatch[0]
    };
  }

  // Cigarettes-per-day fallback.
  const cigaretteMatch =
    notes.match(
      /\b(?:smokes?|smoking)\s+(?:approximately\s+|about\s+|around\s+)?(\d{1,3})\s+cigarettes?\s+(?:a|per)\s+day\b/i
    ) ||
    notes.match(
      /\b(\d{1,3})\s+cigarettes?\s+(?:a|per)\s+day\b/i
    );

  if (
    itemValue(found?.cigarettes_per_day) == null &&
    cigaretteMatch
  ) {
    found.cigarettes_per_day = {
      value: Number(cigaretteMatch[1]),
      evidence: cigaretteMatch[0]
    };
  }

  // "No diabetes mentioned" means unknown, not a confirmed negative.
  if (/\bno (?:history of )?diabetes mentioned\b/i.test(notes)) {
    found.diabetes = {
      value: null,
      evidence: ''
    };
  }

  freshState();
  state.extracted = true;

  // Migraine mapping.
  const migraine = found?.migraine_aura;

  if (typeof itemValue(migraine) === 'string') {
    const value = itemValue(migraine).toLowerCase();

    if (['yes', 'with_aura'].includes(value)) {
      setExtracted(
        'migraine_aura',
        'with_aura',
        itemEvidence(migraine)
      );
    } else if (['no', 'none'].includes(value)) {
      setExtracted(
        'migraine_aura',
        'none',
        itemEvidence(migraine)
      );
    } else if (value === 'without_aura') {
      setExtracted(
        'migraine_aura',
        'without_aura',
        itemEvidence(migraine)
      );
    }
  }

  // Smoking status mapping.
  const smoker = found?.smoker || found?.smoking_status;

  if (typeof itemValue(smoker) === 'string') {
    const value = itemValue(smoker).toLowerCase();

    if (['no', 'non_smoker'].includes(value)) {
      setExtracted(
        'smoking_status',
        'non_smoker',
        itemEvidence(smoker)
      );
    } else if (['yes', 'current_smoker'].includes(value)) {
      setExtracted(
        'smoking_status',
        'current_smoker',
        itemEvidence(smoker)
      );
    } else if (
      ['stopped_under_1yr', 'stopped_1yr_plus'].includes(value)
    ) {
      setExtracted(
        'smoking_status',
        value,
        itemEvidence(smoker)
      );
    }
  }

  // Numeric fields: age, height, weight and cigarettes per day.
  [
    'age',
    'height_cm',
    'weight_kg',
    'cigarettes_per_day'
  ].forEach((key) => {
    const item = found?.[key];
    const raw = itemValue(item);

    const number =
      raw === '' || raw == null
        ? null
        : Number(raw);

    const question = QUESTIONS.find((q) => q.field === key);

    if (
      number !== null &&
      Number.isFinite(number) &&
      question &&
      number >= question.min &&
      number <= question.max
    ) {
      setExtracted(
        key,
        String(number),
        itemEvidence(item)
      );
    }
  });

  // Map generic yes/no only for questions that support that mapping.
  const simpleMapping = {
    personal_clots: {
      yes: 'current_or_history',
      no: 'none'
    },

    family_clots: {
      yes: 'first_degree',
      no: 'none'
    },

    clotting_disorder: {
      yes: 'known_inherited_or_acquired',
      no: 'none'
    },

    major_surgery_immobilisation: {
      yes: 'planned_or_recent',
      no: 'none'
    },

    hep_c_antivirals: {
      yes: 'yes',
      no: 'no'
    }
  };

  Object.entries(simpleMapping).forEach(([key, values]) => {
    const item = found?.[key];
    const raw = itemValue(item);

    if (typeof raw !== 'string') return;

    const value = raw.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(values, value)) {
      setExtracted(
        key,
        values[value],
        itemEvidence(item)
      );
    }
  });

  // These questions require more specific information.
  // A generic "yes" is NOT enough to select a subtype.
  [
    'heart_or_stroke_history',
    'diabetes',
    'liver_disease',
    'breast_cancer'
  ].forEach((key) => {
    const item = found?.[key];
    const raw = itemValue(item);

    if (typeof raw !== 'string') return;

    const value = raw.toLowerCase();

    if (value === 'no') {
      setExtracted(
        key,
        'none',
        itemEvidence(item)
      );
    }
  });

  // Free-text fields. The server represents explicit negative answers
  // with value "no"; use the exact evidence as the visible text.
  ['other_meds', 'allergies'].forEach((key) => {
    const item = found?.[key];

    if (!item) return;

    const raw = itemValue(item);
    const evidence = itemEvidence(item);

    if (typeof raw !== 'string') return;

    if (raw.toLowerCase() === 'no' && evidence) {
      setExtracted(key, evidence, evidence);
    } else if (raw.toLowerCase() === 'yes' && evidence) {
      setExtracted(key, evidence, evidence);
    } else if (raw.trim()) {
      setExtracted(key, raw.trim(), evidence);
    }
  });

  // Blood pressure: allow numeric strings returned by the AI.
  const bp = found?.bp || {};

  const rawSystolic =
    bp.systolic == null || bp.systolic === ''
      ? null
      : Number(bp.systolic);

  const rawDiastolic =
    bp.diastolic == null || bp.diastolic === ''
      ? null
      : Number(bp.diastolic);

  const systolic = Number.isFinite(rawSystolic)
    ? rawSystolic
    : null;

  const diastolic = Number.isFinite(rawDiastolic)
    ? rawDiastolic
    : null;

  state.bp = {
    systolic,
    diastolic,
    aiSystolic: systolic,
    aiDiastolic: diastolic,
    evidence: typeof bp.evidence === 'string'
      ? bp.evidence
      : ''
  };
}


/* ==========================================================
   10. SCREEN 2 — REVIEW ANSWERS
   ========================================================== */

function bpBand(systolic, diastolic) {
  if (systolic == null || diastolic == null) return '';

  if (systolic >= 160 || diastolic >= 100) {
    return 'Reading band: 160/100 or above (demo indicator)';
  }

  if (systolic >= 140 || diastolic >= 90) {
    return 'Reading band: 140–159 / 90–99 (demo indicator)';
  }

  return 'Reading band: below 140/90 (demo indicator)';
}

function bpProblem() {
  const { systolic, diastolic } = state.bp;

  if (systolic == null && diastolic == null) return '';

  if (systolic == null || diastolic == null) {
    return 'Enter both numbers, or leave both blank.';
  }

  if (systolic <= diastolic) {
    return 'The top number should be higher than the bottom number.';
  }

  if (
    systolic < 60 ||
    systolic > 260 ||
    diastolic < 30 ||
    diastolic > 160
  ) {
    return 'That looks too low or too high. Check the numbers.';
  }

  return '';
}

function createLabelledInput(q, input) {
  input.id = `${q.field}-input`;
  input.name = q.field;
  input.setAttribute('aria-label', q.label);
  return input;
}

function renderAnswers() {
  const list = $('answerList');
  list.innerHTML = '';

  $('answersLede').textContent = state.extracted
    ? 'The local AI filled in any details it recognised. Check every answer and correct anything inaccurate.'
    : 'Fill in the available information. Leave details blank if they are not known.';

  QUESTIONS.forEach((q) => {
    const row = document.createElement('div');

    row.className = 'q';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-labelledby', `${q.field}-label`);
    row.setAttribute('aria-describedby', `${q.field}-hint`);

    const text = document.createElement('div');
    const label = document.createElement('p');

    label.className = 'q-label';

    const labelSpan = document.createElement('span');
    labelSpan.id = `${q.field}-label`;
    labelSpan.textContent = q.label;

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.hidden = true;

    label.append(labelSpan, tag);

    const hint = document.createElement('p');
    hint.className = 'q-hint';
    hint.id = `${q.field}-hint`;
    hint.textContent = q.hint;

    text.append(label, hint);
    row.appendChild(text);

    const evidence = document.createElement('p');
    evidence.className = 'evidence';
    evidence.hidden = true;

    let note = null;

    if (q.type === 'select') {
      const select = document.createElement('select');

      createLabelledInput(q, select);

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Choose an answer…';

      select.appendChild(placeholder);

      q.options.forEach(([value, labelText]) => {
        const option = document.createElement('option');

        option.value = value;
        option.textContent = labelText;

        select.appendChild(option);
      });

      select.value = state.answers[q.field].value ?? '';

      select.addEventListener('change', () => {
        updateAnswer(q, select.value || null);
      });

      row.appendChild(select);

    } else if (q.type === 'number') {
      const input = document.createElement('input');

      input.type = 'number';
      input.inputMode = 'numeric';

      if (q.min != null) input.min = String(q.min);
      if (q.max != null) input.max = String(q.max);

      createLabelledInput(q, input);

      input.value = state.answers[q.field].value ?? '';

      input.addEventListener('input', () => {
        updateAnswer(q, input.value);
      });

      row.appendChild(input);

    } else if (q.type === 'text') {
      const textarea = document.createElement('textarea');

      textarea.rows = 2;

      createLabelledInput(q, textarea);

      textarea.value = state.answers[q.field].value ?? '';

      textarea.addEventListener('input', () => {
        updateAnswer(q, textarea.value);
      });

      row.appendChild(textarea);

    } else if (q.type === 'bp') {
      const bp = document.createElement('div');
      bp.className = 'bp';

      const systolic = document.createElement('input');

      systolic.type = 'number';
      systolic.inputMode = 'numeric';
      systolic.id = 'bp-sys';
      systolic.min = '40';
      systolic.max = '300';
      systolic.setAttribute('aria-label', 'Top number (systolic)');
      systolic.placeholder = 'Systolic';

      const separator = document.createElement('span');

      separator.className = 'sep';
      separator.setAttribute('aria-hidden', 'true');
      separator.textContent = '/';

      const diastolic = document.createElement('input');

      diastolic.type = 'number';
      diastolic.inputMode = 'numeric';
      diastolic.id = 'bp-dia';
      diastolic.min = '20';
      diastolic.max = '200';
      diastolic.setAttribute('aria-label', 'Bottom number (diastolic)');
      diastolic.placeholder = 'Diastolic';

      const unit = document.createElement('span');

      unit.className = 'unit';
      unit.textContent = 'mmHg';

      systolic.value = state.bp.systolic ?? '';
      diastolic.value = state.bp.diastolic ?? '';

      const onType = () => {
        state.bp.systolic =
          systolic.value === '' ? null : Number(systolic.value);

        state.bp.diastolic =
          diastolic.value === '' ? null : Number(diastolic.value);

        refreshRow(q);
        updateProgress();
      };

      systolic.addEventListener('input', onType);
      diastolic.addEventListener('input', onType);

      bp.append(systolic, separator, diastolic, unit);
      row.appendChild(bp);

      note = document.createElement('p');
      note.className = 'bp-note';
      note.setAttribute('role', 'status');

      row.appendChild(note);
    }

    row.appendChild(evidence);
    list.appendChild(row);

    rowRefs[q.field] = {
      row,
      tag,
      evidence,
      note
    };

    refreshRow(q);
  });

  $('answersError').textContent = '';
  updateProgress();
}

function updateAnswer(q, value) {
  state.answers[q.field].value = value;

  refreshRow(q);
  updateProgress();
}

function refreshRow(q) {
  const ref = rowRefs[q.field];

  if (!ref) return;

  let evidenceText = '';
  let changed = false;
  let foundInNotes = false;

  if (q.type === 'bp') {
    const bp = state.bp;

    changed =
      bp.systolic !== bp.aiSystolic ||
      bp.diastolic !== bp.aiDiastolic;

    evidenceText = bp.evidence || '';

    foundInNotes =
      bp.aiSystolic !== null ||
      bp.aiDiastolic !== null;

    const problem = bpProblem();  

    if (ref.note) {
      ref.note.textContent =
        problem || bpBand(bp.systolic, bp.diastolic);

      ref.note.classList.toggle('error', Boolean(problem));
    }

  } else {
    const answer = state.answers[q.field];

    changed = answer.value !== answer.aiValue;
    evidenceText = answer.evidence || '';

    foundInNotes =
      answer.aiValue !== null &&
      answer.aiValue !== '';
  }

  if (!state.extracted) {
    ref.tag.hidden = true;

  } else if (changed) {
    ref.tag.hidden = false;
    ref.tag.textContent = 'You changed this';
    ref.tag.classList.add('edited');

  } else if (foundInNotes) {
    ref.tag.hidden = false;
    ref.tag.textContent = 'From notes';
    ref.tag.classList.remove('edited');

  } else {
    ref.tag.hidden = true;
    ref.tag.classList.remove('edited');
  }

  if (!state.extracted) {
    ref.evidence.hidden = true;

  } else if (foundInNotes && evidenceText) {
    ref.evidence.hidden = false;
    ref.evidence.classList.remove('missing');

    ref.evidence.textContent =
      `The notes said: “${evidenceText}”`;

  } else if (!foundInNotes && !changed) {
    ref.evidence.hidden = false;
    ref.evidence.classList.add('missing');

    ref.evidence.textContent = q.type === 'bp'
      ? 'Not in the notes. Take a reading if appropriate.'
      : 'Not identified in the notes. Confirm with the patient.';

  } else {
    ref.evidence.hidden = true;
  }
}

function isAnswered(q) {
  if (q.type === 'bp') {
    return (
      state.bp.systolic != null &&
      state.bp.diastolic != null
    );
  }

  const value = state.answers[q.field]?.value;

  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ''
  );
}

function countAnswered() {
  return QUESTIONS.filter(isAnswered).length;
}

function updateProgress() {
  $('answersProgress').textContent =
    `${countAnswered()} of ${QUESTIONS.length} answered`;
}


/* ==========================================================
   11. CONVERT ANSWERS FOR THE DEMO RULES
   ========================================================== */

function flatAnswers() {
  const answers = {};

  QUESTIONS.forEach((q) => {
    if (q.type === 'bp') return;

    let value = state.answers[q.field]?.value;

    if (q.type === 'number') {
      value =
        value === '' || value == null
          ? null
          : Number(value);

      if (value !== null && !Number.isFinite(value)) {
        value = null;
      }

    } else if (q.type === 'text') {
      value = typeof value === 'string'
        ? value.trim()
        : '';

      if (!value) value = null;

    } else if (value === '') {
      value = null;
    }

    answers[q.field] = value;
  });

  const validBP =
    bpProblem() === '' &&
    state.bp.systolic != null &&
    state.bp.diastolic != null;

  answers.bp_systolic = validBP
    ? state.bp.systolic
    : null;

  answers.bp_diastolic = validBP
    ? state.bp.diastolic
    : null;

  return answers;
}

$('backToNotes').addEventListener('click', () => {
  go('notes');
});

$('seeResult').addEventListener('click', async () => {
  const problem = bpProblem();

  if (problem) {
    $('answersError').textContent =
      `Blood pressure: ${problem}`;

    $('bp-sys').focus();
    return;
  }

  $('answersError').textContent = '';

  const button = $('seeResult');
  button.disabled = true;
  button.textContent = 'Checking rules…';

  try {
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        answers: flatAnswers()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'The rule check failed.'
      );
    }

    // Temporary diagnostic output.
    // We will build the final traffic-light logic after
    // verifying the API findings.
state.result = {
  status:
  data.contraindicationFindings.some(f => f.status === 'contraindicated') ||
  data.ukmecFindings.some(f => String(f.category) === '4')
    ? 'red'
    : data.missingFields.length > 0 ||
      data.contraindicationFindings.length > 0 ||
      data.interactionFindings.length > 0 ||
      data.ukmecFindings.some(f =>
        ['2', '3'].includes(String(f.category))
      )
        ? 'amber'
        : 'green',
  reasons: [
    ...data.contraindicationFindings.map(
      finding => finding.reason
    ),
    ...data.ukmecFindings
      .filter(finding => finding.category === '3' || finding.category === '4')
      .map(finding => `${finding.field}: ${finding.reason}`)
  ],
  followups: [
    ...data.contraindicationFindings.map(
      finding => finding.followup
    ),
    ...data.ukmecFindings
      .filter(finding => finding.followup)
      .map(finding => finding.followup)
  ].filter(Boolean)
};

renderResult();
go('result');

    $('answersError').textContent =
      'Rule checks completed. Open the browser console to inspect the findings.';

  } catch (error) {
    console.error('Rule check failed:', error);

    $('answersError').textContent =
      'Could not check the rules. Please try again.';

  } finally {
    button.disabled = false;
    button.textContent = 'See result';
  }
});


/* ==========================================================
   12. SCREEN 3 — RESULT
   ========================================================== */

function renderResult() {
  const result = state.result;
  const text = STATUS_TEXT[result.status];

  $('resultCard').dataset.status = result.status;
  $('resultTitle').textContent = text.title;
  $('resultSummary').textContent = text.summary;

  const reasons = $('reasons');
reasons.innerHTML = '';

if (result.reasons.length > 0) {
  result.reasons.forEach((reason) => {
    const li = document.createElement('li');
    li.textContent = reason;
    reasons.appendChild(li);
  });
} else if (result.status === 'green') {
  const li = document.createElement('li');
  li.textContent = 'No flags detected by the implemented rules.';
  reasons.appendChild(li);
} else {
  const li = document.createElement('li');
  li.textContent = 'Review the findings and confirm any outstanding information.';
  reasons.appendChild(li);
}

  const followups = $('followups');
  followups.innerHTML = '';

  result.followups.forEach((item) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    const span = document.createElement('span');

    checkbox.type = 'checkbox';
    span.textContent = item;

    label.append(checkbox, span);
    li.appendChild(label);

    followups.appendChild(li);
  });
}

$('backToAnswers').addEventListener('click', () => {
  go('answers');
});

$('confirmBtn').addEventListener('click', () => {
  state.confirmedOn = new Date();

  renderSheet();
  go('sheet');
});


/* ==========================================================
   13. SCREEN 4 — PATIENT SHEET
   ========================================================== */

function renderSheet() {
  const answers = flatAnswers();
  const wording = SHEET_TEXT[state.result.status];

  $('sheetTitle').textContent = wording.heading;

  $('sheetStamp').textContent =
    'Reviewed in this prototype on ' +
    state.confirmedOn.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  const discussed = [];
  const stillToCheck = [];

  QUESTIONS.forEach((q) => {
    if (q.type === 'bp') {
      if (
        answers.bp_systolic == null ||
        answers.bp_diastolic == null
      ) {
        stillToCheck.push('Your blood pressure');

      } else if (
        answers.bp_systolic >= 140 ||
        answers.bp_diastolic >= 90
      ) {
        discussed.push(
          `Your blood pressure entered was ${answers.bp_systolic}/${answers.bp_diastolic}.`
        );
      }

      return;
    }

    const value = answers[q.field];

    if (value == null || value === 'unknown') {
      stillToCheck.push(q.label);
      return;
    }

    if (q.type === 'text') {
      if (value.trim()) {
        discussed.push(
          PATIENT_WORDING[q.field] || `${q.label}: ${value}`
        );
      } else {
        stillToCheck.push(q.label);
      }

      return;
    }

    if (q.type === 'number') {
      if (value !== null) {
        discussed.push(`${q.label}: ${value}.`);
      } else {
        stillToCheck.push(q.label);
      }

      return;
    }

    const neutralValues = [
      'none',
      'non_smoker',
      'no',
      'gestational_history',
      'family_history_only'
    ];

    if (!neutralValues.includes(value)) {
      discussed.push(
        PATIENT_WORDING[q.field] ||
        `${q.label} needs review.`
      );
    }
  });

  const body = $('sheetBody');
  body.innerHTML = '';

  function addList(title, items) {
    if (!items.length) return;

    const heading = document.createElement('h3');
    heading.textContent = title;

    const ul = document.createElement('ul');

    items.forEach((item) => {
      const li = document.createElement('li');

      li.textContent = item;

      ul.appendChild(li);
    });

    body.append(heading, ul);
  }

  addList('What we discussed', discussed);

  if (discussed.length) {
    const paragraph = document.createElement('p');

    paragraph.textContent =
      'These answers need review by a qualified clinician. This prototype does not provide medical advice.';

    body.appendChild(paragraph);
  }

  addList('Still to check', stillToCheck);
  addList('What happens next', wording.next);
}

$('printBtn').addEventListener('click', () => {
  window.print();
});

$('backToResult').addEventListener('click', () => {
  go('result');
});

$('newPatient').addEventListener('click', () => {
  freshState();

  $('notes').value = '';
  $('readStatus').textContent = '';

  renderAnswers();
  go('notes');
});


/* ==========================================================
   14. LARGER TEXT TOGGLE
   ========================================================== */

const textSizeBtn = $('textSize');

textSizeBtn.addEventListener('click', () => {
  const large =
    document.documentElement.classList.toggle('large');

  textSizeBtn.setAttribute(
    'aria-pressed',
    String(large)
  );

  textSizeBtn.textContent =
    large ? 'Normal text' : 'Larger text';
});


/* ==========================================================
   15. START
   ========================================================== */

freshState();
go('notes');