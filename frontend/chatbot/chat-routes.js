'use strict';

/* ==========================================================
   Accessibility chatbot routes.
   In server.js, add this line above app.listen:
       require('./chat-routes')(app);
   ========================================================== */

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';   // try qwen2.5:7b for better translations

const THEMES = ['default', 'redgreen', 'blueyellow'];
const FONTS = ['default', 'readable', 'serif'];
const LANG = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

// one function that talks to the model and always returns parsed JSON
async function ask(system, user) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: 'json',
      options: { temperature: 0 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const data = await response.json();
  try {
    return JSON.parse(data.message.content);
  } catch {
    // do not pass the parse error on: its message can contain a piece of the patient text
    throw new Error('Model did not return valid JSON.');
  }
}

// all numbers in a piece of text, sorted, so two texts can be compared
const nums = (s) => (String(s).match(/\d+(?:\.\d+)?/g) || []).sort().join(',');

const CHAT_SYSTEM = `You are a display assistant for a clinic. A doctor describes how a patient's
information sheet should be displayed. Reply with JSON only:
{"reply": "one short friendly sentence saying what you changed",
 "settings": {"textSize": 16-40, "font": "default|readable|serif",
              "theme": "default|redgreen|blueyellow", "lang": "BCP-47 code such as en, pl, ur"}}
Rules:
- Start from the current settings and change only what the doctor asks for.
- textSize is in pixels. "bigger" means add about 4-6. The default is 18.
- "redgreen" is for red-green colour blindness. "blueyellow" is for blue-yellow colour blindness.
- If the request is not about display, leave all settings unchanged and say you can only change the display.
- Never give medical advice.`;

module.exports = function addChatRoutes(app) {

  // ---- doctor message -> display settings ----
  app.post('/api/chat', async (req, res) => {
    const message = req.body?.message;
    const sent = req.body?.current || {};

    if (typeof message !== 'string' || !message.trim() || message.length > 500) {
      return res.status(400).json({ error: 'Please type a short message (under 500 characters).' });
    }

    // only the four display settings are ever passed on, nothing else the page sends
    const current = {
      textSize: Number(sent.textSize) || 18,
      font: sent.font,
      theme: sent.theme,
      lang: sent.lang
    };

    try {
      const out = await ask(
        CHAT_SYSTEM,
        `Current settings: ${JSON.stringify(current)}\nDoctor says: ${message.trim()}`
      );

      // start from what the page already has, then validate everything the model sent
      const asked = out.settings && typeof out.settings === 'object' ? out.settings : {};
      const s = {
        textSize: asked.textSize ?? current.textSize,
        font: asked.font ?? current.font,
        theme: asked.theme ?? current.theme,
        lang: asked.lang ?? current.lang
      };
      s.textSize = Math.min(40, Math.max(16, Math.round(Number(s.textSize) || 18)));
      if (!FONTS.includes(s.font)) s.font = 'default';
      if (!THEMES.includes(s.theme)) s.theme = 'default';
      if (typeof s.lang !== 'string' || !LANG.test(s.lang)) s.lang = 'en';

      const reply = typeof out.reply === 'string' && out.reply.trim()
        ? out.reply.trim().slice(0, 300)
        : 'Done.';

      return res.json({ reply, settings: s });

    } catch (error) {
      console.error('Chat error:', error.message);
      return res.status(500).json({
        error: 'Could not reach the language model. Check that Ollama is running.'
      });
    }
  });

  // ---- translate the text of the patient sheet ----
  app.post('/api/translate', async (req, res) => {
    const texts = req.body?.texts;
    const lang = req.body?.lang;

    if (
      !Array.isArray(texts) || texts.length === 0 || texts.length > 200 ||
      !texts.every((t) => typeof t === 'string') ||
      texts.join('').length > 20000 ||
      typeof lang !== 'string' || !LANG.test(lang)
    ) {
      return res.status(400).json({ error: 'Invalid translation request.' });
    }

    try {
      const out = await ask(
        `Translate each string of patient information into the language with code "${lang}".
Return JSON only: {"translations": [...]} with exactly ${texts.length} strings in the same order.
Keep every number, date, dose, unit and drug name exactly as written, using digits 0-9.
Do not add, remove or reword any medical advice.`,
        JSON.stringify({ texts })
      );

      const t = out.translations;
      if (!Array.isArray(t) || t.length !== texts.length || !t.every((x) => typeof x === 'string')) {
        throw new Error('Model returned an unexpected shape.');
      }

      // safety check: every number must survive the translation
      if (nums(texts.join(' ')) !== nums(t.join(' '))) {
        return res.status(422).json({
          error: 'The translation changed a number, so it was not applied. Please try again.'
        });
      }

      return res.json({ translations: t });

    } catch (error) {
      console.error('Translate error:', error.message);
      return res.status(500).json({ error: 'Translation failed. Check that Ollama is running.' });
    }
  });
};
