'use strict';

/* ==========================================================
   1. QUESTIONS
   The `field` names must match the team's shared question
   list and the rules file. Change wording here freely, but
   do not rename a field without telling everyone.
   ========================================================== */
const QUESTIONS = [
  { field: 'migraine_aura', label: 'Migraine with aura',
    hint: 'Flashing lights, zigzags or blind spots before a headache' },
  { field: 'smoker', label: 'Currently smokes',
    hint: 'Cigarettes or other tobacco' },
  { field: 'high_bp', label: 'High blood pressure',
    hint: 'Diagnosed, or a high reading today' },
  { field: 'family_clots', label: 'Blood clots in the family',
    hint: 'A parent, brother or sister who had a clot or stroke when young' },
  { field: 'breast_cancer', label: 'Breast cancer',
    hint: 'Now or in the past' },
  { field: 'diabetes', label: 'Diabetes',
    hint: 'Type 1 or type 2' },
  { field: 'allergies', label: 'Allergy to hormonal contraception',
    hint: 'To the pill or anything in it' },
  { field: 'other_meds', label: 'Other medicines that can affect the pill',
    hint: 'For example some epilepsy medicines, rifampicin, St John’s wort' },
];

const CHOICES = [
  ['yes', 'Yes'],
  ['no', 'No'],
  ['unknown', 'Not sure'],
];


/* ==========================================================
   2. getResult(answers)   <-- THE PLUG-IN POINT
   Input:  { migraine_aura: 'yes' | 'no' | 'unknown', ... }
   Output: { status: 'red' | 'amber' | 'green',
             reasons: [string, ...],
             followups: [string, ...] }

   !! PLACEHOLDER ONLY !!
   These rules are made up to demo the three colours.
   They are NOT clinical rules. Replace this whole function
   with the real logic that reads the UKMEC rules file.
   ========================================================== */
function getResult(answers) {
  const rank = { green: 0, amber: 1, red: 2 };
  let status = 'green';
  const reasons = [];

  const raise = (s) => { if (rank[s] > rank[status]) status = s; };

  QUESTIONS.forEach((q) => {
    const a = answers[q.field];

    if (a === 'unknown') {
      reasons.push(`${q.label}: not answered. Ask before prescribing.`);
      raise('amber');
    } else if (a === 'yes') {
      const demoRed = q.field === 'migraine_aura' || q.field === 'breast_cancer';
      reasons.push(`${q.label}: yes (placeholder rule, replace with the UKMEC reason).`);
      raise(demoRed ? 'red' : 'amber');
    }
  });

  if (reasons.length === 0) {
    reasons.push('No flags from these eight questions.');
  }

  const followups = [
    'Confirm each flagged answer with the patient',
    'Explain the reason in plain words',
    'Check the full UKMEC entry before prescribing',
  ];
  if (status === 'green') {
    followups.push('Ask about anything these questions do not cover');
  }

  return { status, reasons, followups };
}


/* ==========================================================
   3. PAGE CODE (no need to touch this to change the rules)
   ========================================================== */
const form        = document.getElementById('form');
const questionList = document.getElementById('questionList');
const resultEl    = document.getElementById('result');
const progressEl  = document.getElementById('progress');
const titleEl     = document.getElementById('resultTitle');
const summaryEl   = document.getElementById('resultSummary');
const detailEl    = document.getElementById('resultDetail');
const reasonsEl   = document.getElementById('reasons');
const followupsEl = document.getElementById('followups');
const confirmEl   = document.getElementById('confirm');

const STATUS_TEXT = {
  red:   { title: 'Not suitable',
           summary: 'At least one answer rules out the combined pill.' },
  amber: { title: 'Needs a closer look',
           summary: 'Some answers need checking before prescribing.' },
  green: { title: 'No flags found',
           summary: 'Nothing flagged from these eight questions. They do not cover everything.' },
};

/* Build the questions */
QUESTIONS.forEach((q) => {
  const row = document.createElement('div');
  row.className = 'q';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-labelledby', `${q.field}-label`);
  row.setAttribute('aria-describedby', `${q.field}-hint`);

  const text = document.createElement('div');
  text.innerHTML =
    `<p class="q-label" id="${q.field}-label">${q.label}</p>` +
    `<p class="q-hint" id="${q.field}-hint">${q.hint}</p>`;

  const choices = document.createElement('div');
  choices.className = 'choices';
  CHOICES.forEach(([value, name]) => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="${q.field}" value="${value}"><span>${name}</span>`;
    choices.appendChild(label);
  });

  row.append(text, choices);
  questionList.appendChild(row);
});

/* Read answers. A blank question counts as "unknown". */
function getAnswers() {
  const answers = {};
  QUESTIONS.forEach((q) => {
    const picked = form.querySelector(`input[name="${q.field}"]:checked`);
    answers[q.field] = picked ? picked.value : 'unknown';
  });
  return answers;
}

function countAnswered() {
  return QUESTIONS.filter((q) =>
    form.querySelector(`input[name="${q.field}"]:checked`)
  ).length;
}

function updateProgress() {
  progressEl.textContent = `${countAnswered()} of ${QUESTIONS.length} answered`;
}

function showResult(result) {
  const text = STATUS_TEXT[result.status];
  resultEl.dataset.status = result.status;
  titleEl.textContent = text.title;
  summaryEl.textContent = text.summary;

  reasonsEl.innerHTML = '';
  result.reasons.forEach((r) => {
    const li = document.createElement('li');
    li.textContent = r;
    reasonsEl.appendChild(li);
  });

  followupsEl.innerHTML = '';
  result.followups.forEach((f) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    const span = document.createElement('span');
    span.textContent = f;
    label.append(box, span);
    li.appendChild(label);
    followupsEl.appendChild(li);
  });

  confirmEl.checked = false;
  detailEl.hidden = false;
}

function resetResult() {
  resultEl.dataset.status = 'none';
  titleEl.textContent = 'No result yet';
  summaryEl.textContent =
    'Answer the questions, then press Check answers. Anything left blank counts as not sure.';
  detailEl.hidden = true;
  updateProgress();
}

form.addEventListener('change', updateProgress);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  showResult(getResult(getAnswers()));

  // On phones the result sits below the questions, so bring it into view.
  if (window.matchMedia('(max-width: 860px)').matches) {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultEl.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  }
});

document.getElementById('clear').addEventListener('click', () => {
  form.reset();
  resetResult();
});

/* Larger text toggle */
const textSizeBtn = document.getElementById('textSize');
textSizeBtn.addEventListener('click', () => {
  const large = document.documentElement.classList.toggle('large');
  textSizeBtn.setAttribute('aria-pressed', String(large));
  textSizeBtn.textContent = large ? 'Normal text' : 'Larger text';
});

updateProgress();