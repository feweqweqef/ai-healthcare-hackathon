'use strict';

/* ==========================================================
   Display assistant: a small chat tab where the doctor says how the
   patient sheet should look. Add to index.html after script.js:
       <script src="chatbot.js"></script>
   ========================================================== */

(function () {
  const state = { textSize: 18, font: 'default', theme: 'default', lang: 'en' };
  const RTL_LANGS = ['ar', 'ur', 'he', 'fa'];

  const GREETING = 'Hi! Tell me how this patient needs their information displayed. ' +
    'Please do not type names or other identifying details.';

  // the sheet text before any translation, so "back to English" always restores it
  let saved = null;   // { nodes: [...], texts: [...] }

  /* ---------- 1. Load the styles and build the widget ---------- */
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'chatbot/chatbot.css';
  document.head.appendChild(css);

  const toggle = document.createElement('button');
  toggle.id = 'bot-toggle';
  toggle.type = 'button';
  toggle.textContent = '💬';
  toggle.setAttribute('aria-label', 'Open display assistant');
  toggle.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('section');
  panel.id = 'bot-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Display assistant');
  panel.innerHTML = `
    <header>
      <strong>Display assistant</strong>
      <button id="bot-close" type="button" aria-label="Close">×</button>
    </header>
    <div id="bot-log" aria-live="polite"></div>
    <form id="bot-form">
      <input id="bot-input" aria-label="Message" placeholder="e.g. bigger text, Polish, colour blind" autocomplete="off">
      <button type="submit">Send</button>
    </form>`;

  document.body.append(toggle, panel);

  const log = document.getElementById('bot-log');
  const input = document.getElementById('bot-input');

  function say(text, who) {
    const div = document.createElement('div');
    div.className = `bot-msg ${who}`;
    div.textContent = text;          // textContent, so nothing typed or translated can inject HTML
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function openPanel(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!log.children.length) say(GREETING, 'bot');
      input.focus();
    }
  }

  toggle.addEventListener('click', () => openPanel(panel.hidden));
  document.getElementById('bot-close').addEventListener('click', () => {
    openPanel(false);
    toggle.focus();
  });

  /* ---------- 2. Apply display settings (no AI needed here) ---------- */
  function applyDisplay() {
    // 18px is the page's own default, so go back to the stylesheet's value
    if (state.textSize === 18) document.documentElement.style.removeProperty('font-size');
    else document.documentElement.style.fontSize = `${state.textSize}px`;

    document.body.classList.remove('font-readable', 'font-serif', 'theme-redgreen', 'theme-blueyellow');
    if (state.font !== 'default') document.body.classList.add(`font-${state.font}`);
    if (state.theme !== 'default') document.body.classList.add(`theme-${state.theme}`);
  }

  /* ---------- 3. Translate the patient sheet ---------- */
  function sheetRoot() {
    return document.getElementById('screen-sheet');
  }

  // every visible piece of text on the sheet (not the buttons)
  function sheetTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!node.nodeValue.trim()) continue;
      if (parent && parent.closest('button, .no-print, script, style')) continue;
      nodes.push(node);
    }
    return nodes;
  }

  function setLangAttributes(lang) {
    const root = sheetRoot();
    if (!root) return;
    root.lang = lang;
    root.dir = RTL_LANGS.includes(lang.split('-')[0]) ? 'rtl' : 'ltr';
  }

  // if the sheet was rebuilt (new patient), the saved text is out of date
  function syncLanguage() {
    if (saved && !saved.nodes.every((n) => n.isConnected)) {
      saved = null;
      state.lang = 'en';
    }
  }

  async function setLanguage(lang) {
    const root = sheetRoot();
    if (!root || root.hidden) {
      return 'Open the patient sheet first, then ask again and I will translate it.';
    }
    syncLanguage();

    if (lang === 'en') {
      if (saved) saved.nodes.forEach((n, i) => { n.nodeValue = saved.texts[i]; });
      state.lang = 'en';
      setLangAttributes('en');
      return null;
    }

    if (!saved) {
      const nodes = sheetTextNodes(root);
      saved = { nodes, texts: nodes.map((n) => n.nodeValue) };
    }

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: saved.texts.map((t) => t.trim()), lang })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Translation failed.');

    saved.nodes.forEach((n, i) => { n.nodeValue = data.translations[i]; });
    state.lang = lang;
    setLangAttributes(lang);
    return null;
  }

  /* ---------- 4. New patient: forget the last patient's chat and settings ---------- */
  function resetForNewPatient() {
    log.textContent = '';
    Object.assign(state, { textSize: 18, font: 'default', theme: 'default', lang: 'en' });
    saved = null;
    applyDisplay();
    setLangAttributes('en');
    if (!panel.hidden) say(GREETING, 'bot');
  }

  const newPatientBtn = document.getElementById('newPatient');
  if (newPatientBtn) newPatientBtn.addEventListener('click', resetForNewPatient);

  /* ---------- 5. Send the doctor's message ---------- */
  document.getElementById('bot-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    say(message, 'user');

    try {
      syncLanguage();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, current: state })
      });
      const data = await response.json();
      if (!response.ok) {
        say(data.error || 'Sorry, that did not work.', 'bot');
        return;
      }

      const wantedLang = data.settings.lang;
      Object.assign(state, data.settings, { lang: state.lang });   // language changes only after it is translated
      applyDisplay();
      say(data.reply, 'bot');

      if (wantedLang !== state.lang) {
        const problem = await setLanguage(wantedLang);
        if (problem) say(problem, 'bot');
        else if (state.lang !== 'en') {
          say('Translated by AI. Please have a clinician check it before it is given to the patient.', 'bot');
        }
      }
    } catch (error) {
      say(error.message || 'Could not reach the server.', 'bot');
    }
  });
})();
