'use strict';

/* ==========================================================
   1. QUESTIONS
   ========================================================== */

const QUESTIONS = [
  {
    field: 'migraine_aura',
    type: 'choice',
    label: 'Migraine with aura',
    hint: 'Flashing lights, zigzags or blind spots before a headache'
  },
  {
    field: 'smoker',
    type: 'choice',
    label: 'Currently smokes',
    hint: 'Cigarettes or other tobacco'
  },
  {
    field: 'bp',
    type: 'bp',
    label: 'Blood pressure',
    hint: 'Today’s reading, or the most recent one'
  },
  {
    field: 'family_clots',
    type: 'choice',
    label: 'Blood clots in the family',
    hint: 'A parent, brother or sister who had a clot or stroke when young'
  },
  {
    field: 'breast_cancer',
    type: 'choice',
    label: 'Breast cancer',
    hint: 'Now or in the past'
  },
  {
    field: 'diabetes',
    type: 'choice',
    label: 'Diabetes',
    hint: 'Type 1 or type 2'
  },
  {
    field: 'allergies',
    type: 'choice',
    label: 'Allergy to hormonal contraception',
    hint: 'To the pill or anything in it'
  },
  {
    field: 'other_meds',
    type: 'choice',
    label: 'Other medicines that can affect the pill',
    hint: 'For example some epilepsy medicines, rifampicin, St John’s wort'
  }
];

const CHOICES = [
  ['yes', 'Yes'],
  ['no', 'No'],
  ['unknown', 'Not sure']
];

const EXAMPLE_NOTES = `FICTIONAL HACKATHON TEST PATIENT, age 28.
Wants to discuss the combined pill.
Smokes about 10 cigarettes a day. BP today 148/94.
Gets headaches with visual aura (zigzag lines) about once a month.
Mum had a DVT at 40. No history of breast cancer.
No diabetes mentioned. Not on any regular medicines.
No known allergies.`;


/* ==========================================================
   2. AI EXTRACTION
   Calls the local backend, which sends notes to Ollama.
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
   3. DEMO RULES ONLY
   NOT validated UKMEC rules. NOT for clinical use.
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
      const s = answers.bp_systolic;
      const d = answers.bp_diastolic;

      if (s == null || d == null) {
        reasons.push(
          'Blood pressure: not measured. Take a reading before prescribing.'
        );
        raise('amber');
      } else if (s >= 160 || d >= 100) {
        reasons.push(
          `Blood pressure ${s}/${d}: placeholder red rule, not a clinical rule.`
        );
        raise('red');
      } else if (s >= 140 || d >= 90) {
        reasons.push(
          `Blood pressure ${s}/${d}: placeholder amber rule, not a clinical rule.`
        );
        raise('amber');
      }

      return;
    }

    const answer = answers[q.field];

    if (answer === 'unknown') {
      reasons.push(`${q.label}: not answered. Ask before prescribing.`);
      raise('amber');
    } else if (answer === 'yes') {
      const demoRed =
        q.field === 'migraine_aura' ||
        q.field === 'breast_cancer';

      reasons.push(
        `${q.label}: yes (placeholder demo rule, not a clinical rule).`
      );

      raise(demoRed ? 'red' : 'amber');
    }
  });

  if (reasons.length === 0) {
    reasons.push('No flags found by the placeholder demo rules.');
  }

  const followups = [
    'Confirm each flagged answer with the patient',
    'Explain the reason in plain words',
    'Check the full UKMEC entry before prescribing'
  ];

  if (status === 'green') {
    followups.push(
      'Ask about anything these questions do not cover'
    );
  }

  return {
    status,
    reasons,
    followups
  };
}


/* ==========================================================
   4. PATIENT SHEET WORDING — PLACEHOLDER
   ========================================================== */

const PATIENT_WORDING = {
  migraine_aura:
    'You have described migraine symptoms with flashing lights or blind spots.',
  smoker:
    'You have said that you smoke.',
  family_clots:
    'You have reported a close relative with a blood clot or stroke.',
  breast_cancer:
    'You have reported breast cancer now or in the past.',
  diabetes:
    'You have reported diabetes.',
  allergies:
    'You have reported an allergy.',
  other_meds:
    'You take other medicines that may need checking.'
};

const SHEET_TEXT = {
  red: {
    heading: 'Your answers need a clinician’s review',
    next: [
      'Your doctor will discuss suitable options with you.',
      'This prototype cannot determine whether the combined pill is appropriate.'
    ]
  },

  amber: {
    heading: 'Some information needs checking',
    next: [
      'Your doctor will review these points with you.',
      'This prototype cannot determine whether the combined pill is appropriate.'
    ]
  },

  green: {
    heading: 'No flags found by the demo questions',
    next: [
      'Your doctor will explain the options available to you.',
      'This prototype does not cover every factor needed for a prescribing decision.'
    ]
  }
};

const STATUS_TEXT = {
  red: {
    title: 'Needs clinician review',
    summary:
      'A demo rule flagged at least one answer. This is not a clinical decision.'
  },

  amber: {
    title: 'Needs a closer look',
    summary:
      'Some answers need checking. These are placeholder demo rules only.'
  },

  green: {
    title: 'No demo flags found',
    summary:
      'This does not mean the combined pill is clinically suitable.'
  }
};


/* ==========================================================
   5. PAGE STATE
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

function freshState() {
  state.extracted = false;
  state.result = null;
  state.confirmedOn = null;
  state.answers = {};

  QUESTIONS
    .filter((q) => q.type === 'choice')
    .forEach((q) => {
      state.answers[q.field] = {
        value: null,
        aiValue: null,
        evidence: null
      };
    });

  state.bp = {
    systolic: null,
    diastolic: null,
    aiSystolic: null,
    aiDiastolic: null,
    evidence: null
  };
}


/* ==========================================================
   6. SCREEN SWITCHING
   ========================================================== */

function go(name) {
  SCREENS.forEach((screen) => {
    $(`screen-${screen}`).hidden = screen !== name;
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

  $(headings[name]).focus({ preventScroll: true });
}


/* ==========================================================
   7. SCREEN 1 — CONSULTATION NOTES
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
   8. APPLY AI EXTRACTION
   ========================================================== */

function applyExtraction(found) {
  freshState();
  state.extracted = true;

  QUESTIONS
    .filter((q) => q.type === 'choice')
    .forEach((q) => {
      const field = found?.[q.field];

      const value =
        field && ['yes', 'no'].includes(field.value)
          ? field.value
          : null;

      state.answers[q.field] = {
        value,
        aiValue: value,
        evidence:
          field && typeof field.evidence === 'string'
            ? field.evidence
            : null
      };
    });

  const bp = found?.bp;

  const systolic =
    Number.isFinite(bp?.systolic) ? bp.systolic : null;

  const diastolic =
    Number.isFinite(bp?.diastolic) ? bp.diastolic : null;

  state.bp = {
    systolic,
    diastolic,
    aiSystolic: systolic,
    aiDiastolic: diastolic,
    evidence:
      bp && typeof bp.evidence === 'string'
        ? bp.evidence
        : null
  };
}


/* ==========================================================
   9. SCREEN 2 — REVIEW ANSWERS
   ========================================================== */

function bpBand(systolic, diastolic) {
  if (systolic == null || diastolic == null) {
    return '';
  }

  if (systolic >= 160 || diastolic >= 100) {
    return 'Reading band: 160/100 or above';
  }

  if (systolic >= 140 || diastolic >= 90) {
    return 'Reading band: 140–159 / 90–99';
  }

  return 'Reading band: below 140/90';
}

function bpProblem() {
  const { systolic, diastolic } = state.bp;

  if (systolic == null && diastolic == null) {
    return '';
  }

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

function renderAnswers() {
  const list = $('answerList');

  list.innerHTML = '';
  

  $('answersLede').textContent = state.extracted
    ? 'The local AI filled these in from the notes. Check each one and change anything that is wrong.'
    : 'Fill in each answer. Anything left blank counts as not sure.';

  QUESTIONS.forEach((q) => {
    const row = document.createElement('div');

    row.className = 'q';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-labelledby', `${q.field}-label`);
    row.setAttribute('aria-describedby', `${q.field}-hint`);

    const text = document.createElement('div');

    text.innerHTML =
      `<p class="q-label">` +
      `<span id="${q.field}-label">${q.label}</span>` +
      `<span class="tag" hidden></span>` +
      `</p>` +
      `<p class="q-hint" id="${q.field}-hint">${q.hint}</p>`;

    row.appendChild(text);

    const evidence = document.createElement('p');

    evidence.className = 'evidence';
    evidence.hidden = true;

    let note = null;

    if (q.type === 'choice') {
      const choices = document.createElement('div');

      choices.className = 'choices';

      CHOICES.forEach(([value, labelText]) => {
        const label = document.createElement('label');

        label.innerHTML =
          `<input type="radio" name="${q.field}" value="${value}">` +
          `<span>${labelText}</span>`;

        const input = label.querySelector('input');

        input.checked =
          state.answers[q.field].value === value;

        input.addEventListener('change', () => {
          state.answers[q.field].value = value;

          refreshRow(q);
          updateProgress();
        });

        choices.appendChild(label);
      });

      row.appendChild(choices);
    } else {
      const bp = document.createElement('div');

      bp.className = 'bp';

      bp.innerHTML =
        `<input type="number" inputmode="numeric" id="bp-sys" ` +
        `aria-label="Top number (systolic)" min="40" max="300">` +
        `<span class="sep" aria-hidden="true">/</span>` +
        `<input type="number" inputmode="numeric" id="bp-dia" ` +
        `aria-label="Bottom number (diastolic)" min="20" max="200">` +
        `<span class="unit">mmHg</span>`;

      const systolic = bp.querySelector('#bp-sys');
      const diastolic = bp.querySelector('#bp-dia');

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

      row.appendChild(bp);

      note = document.createElement('p');
      note.className = 'bp-note';
      note.setAttribute('role', 'status');
    }

    row.appendChild(evidence);

    if (note) {
      row.appendChild(note);
    }

    list.appendChild(row);

    rowRefs[q.field] = {
      tag: row.querySelector('.tag'),
      evidence,
      note
    };

    refreshRow(q);
  });

  $('answersError').textContent = '';

  updateProgress();
}


/* ==========================================================
   10. AI TAGS AND EVIDENCE
   ========================================================== */

function refreshRow(q) {
  const ref = rowRefs[q.field];

  let changed;
  let evidenceText;
  let foundInNotes;

  if (q.type === 'choice') {
    const answer = state.answers[q.field];

    changed = answer.value !== answer.aiValue;
    evidenceText = answer.evidence;
    foundInNotes = answer.aiValue !== null;
  } else {
    const bp = state.bp;

    changed =
      bp.systolic !== bp.aiSystolic ||
      bp.diastolic !== bp.aiDiastolic;

    evidenceText = bp.evidence;

    foundInNotes =
      bp.aiSystolic !== null &&
      bp.aiDiastolic !== null;

    const problem = bpProblem();

    ref.note.textContent =
      problem || bpBand(bp.systolic, bp.diastolic);

    ref.note.classList.toggle('error', Boolean(problem));
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

    ref.evidence.textContent =
      q.type === 'bp'
        ? 'Not in the notes. Take a reading.'
        : 'Not in the notes. Ask the patient.';
  } else {
    ref.evidence.hidden = true;
  }
}

function countAnswered() {
  let count = 0;

  QUESTIONS.forEach((q) => {
    if (q.type === 'choice') {
      if (state.answers[q.field].value !== null) {
        count++;
      }
    } else if (
      state.bp.systolic != null &&
      state.bp.diastolic != null
    ) {
      count++;
    }
  });

  return count;
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

  QUESTIONS
    .filter((q) => q.type === 'choice')
    .forEach((q) => {
      answers[q.field] =
        state.answers[q.field].value || 'unknown';
    });

  const validBP = bpProblem() === '';

  answers.bp_systolic =
    validBP ? state.bp.systolic : null;

  answers.bp_diastolic =
    validBP ? state.bp.diastolic : null;

  return answers;
}

$('backToNotes').addEventListener('click', () => {
  go('notes');
});

$('seeResult').addEventListener('click', () => {
  const problem = bpProblem();

  if (problem) {
    $('answersError').textContent =
      `Blood pressure: ${problem}`;

    $('bp-sys').focus();

    return;
  }

  $('answersError').textContent = '';

  state.result = getResult(flatAnswers());

  renderResult();
  go('result');
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

  result.reasons.forEach((reason) => {
    const li = document.createElement('li');

    li.textContent = reason;
    reasons.appendChild(li);
  });

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
      if (answers.bp_systolic == null) {
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

    if (answers[q.field] === 'yes') {
      discussed.push(PATIENT_WORDING[q.field]);
    }

    if (answers[q.field] === 'unknown') {
      stillToCheck.push(q.label);
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

  go('notes');
});


/* ==========================================================
   14. LARGER TEXT TOGGLE
   ========================================================== */

const textSizeBtn = $('textSize');

textSizeBtn.addEventListener('click', () => {
  const large =
    document.documentElement.classList.toggle('large');

  textSizeBtn.setAttribute('aria-pressed', String(large));

  textSizeBtn.textContent =
    large ? 'Normal text' : 'Larger text';
});


/* ==========================================================
   15. START
   ========================================================== */

freshState();
go('notes');