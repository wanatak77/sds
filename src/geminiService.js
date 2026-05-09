import { getQuizCache, saveQuizCache } from './firebase';

// ── API Config ───────────────────────────────────────────────
const XAI_URL   = 'https://api.x.ai/v1/chat/completions';
const XAI_KEY   = process.env.REACT_APP_XAI_API_KEY || '';
const XAI_MODEL = 'grok-beta';

const GEMINI_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

// ── Parser (shared) ──────────────────────────────────────────
const parseQuestions = (text) => {
  const questions = [];
  const clean = text.replace(/\*\*/g, '');
  // More lenient split: handle any number followed by . or )
  const blocks = clean.split(/\n(?=\d{1,3}[.)]\s+)/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').filter((l) => l.trim());
    if (lines.length < 4) continue;

    // Lenient question match
    const qMatch = lines[0].match(/^\d+[.)]\s*(.+)/);
    if (!qMatch) continue;

    const question = qMatch[1].trim();
    const options  = [];
    let correct    = 0;
    let explanation = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match explanation
      const expMatch = line.match(/^(explanation|correct explanation):\s*(.+)/i);
      if (expMatch) { explanation = expMatch[2].trim(); continue; }
      
      // Match options
      const optMatch = line.match(/^([A-D])[.)]\s*(.+)/i);
      if (optMatch) {
        const raw = optMatch[2].trim();
        const isCorrect = raw.endsWith('*') || /\(correct\)|\[correct\]/i.test(raw);
        options.push(raw.replace(/\*$|\(correct\)|\[correct\]/gi, '').trim());
        if (isCorrect) correct = options.length - 1;
        continue;
      }
      
      // Fallback for correct answer indicator like "Answer: B"
      const ansMatch = line.match(/^answer:\s*([A-D])/i);
      if (ansMatch) {
        const letter = ansMatch[1].toUpperCase();
        correct = letter.charCodeAt(0) - 65;
      }
    }

    if (options.length >= 2) {
      // Ensure we have exactly 4 options by padding if necessary (though usually we want 4)
      while (options.length < 4) options.push('None of the above');
      questions.push({ 
        question, 
        options: options.slice(0, 4), 
        correct: Math.min(correct, 3), 
        explanation: explanation || 'Refer to the textbook for detailed explanation.',
        answered: null 
      });
    }
  }
  return questions;
};

// ── Build prompt ─────────────────────────────────────────────
const buildPrompt = (subject, type, start, size) => {
  const isRemedial = type.toLowerCase().includes('remedial');
  return `You are an expert Ethiopian National Exam (EUEE) content creator.
Generate exactly ${size} high-quality, highly challenging multiple choice questions for ${type} ${subject}.
Ensure the questions comprehensively cover ALL top major chapters and topics taught in the Ethiopian curriculum for this subject.

Number them ${start} to ${start + size - 1}.

STRICT FORMAT:
${start}. [Question text]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [A, B, C, or D]
Explanation: [Why it is correct]

Difficulty: ${isRemedial ? 'Remedial/Foundational (Moderate)' : 'Hard - Real Ethiopian University Entrance Exam (EUEE) Standard'}.
Context: Ethiopian Ministry of Education Curriculum. Make the distractors (wrong options) tricky to conceptually test the student.`;
};

// ── Grok fetch ───────────────────────────────────────────────
const fetchFromGrok = async (prompt) => {
  const res = await fetch(XAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_KEY}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMITED');
  const data = await res.json();
  if (!res.ok) throw new Error(`Grok ${res.status}: ${data?.error?.message || 'Unknown error'}`);
  return data?.choices?.[0]?.message?.content || '';
};

// ── Gemini fetch ─────────────────────────────────────────────
const fetchFromGemini = async (prompt) => {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 },
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMITED');
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message || 'Unknown error'}`);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

// ── Batch: try both, take best ────────────────────────────────
const fetchBatch = async (subject, type, start, size) => {
  const prompt = buildPrompt(subject, type, start, size);
  let grokRes = [];
  
  try {
    console.log(`[Grok] Requesting Q${start}...`);
    const text = await fetchFromGrok(prompt);
    grokRes = parseQuestions(text);
    console.log(`[Grok] Got ${grokRes.length}/${size}`);
    if (grokRes.length >= size) return grokRes;
  } catch (err) {
    console.warn(`[Grok] Error: ${err.message}`);
  }

  try {
    console.log(`[Gemini] Requesting Q${start}...`);
    const text = await fetchFromGemini(prompt);
    const geminiRes = parseQuestions(text);
    console.log(`[Gemini] Got ${geminiRes.length}/${size}`);
    
    // Return the one that gave more questions
    return geminiRes.length >= grokRes.length ? geminiRes : grokRes;
  } catch (err) {
    console.error(`[Gemini] Error: ${err.message}`);
    return grokRes;
  }
};

// ── Main export ──────────────────────────────────────────────
export const generateQuiz = async (subject, type, count = 100) => {
  console.log(`Generating ${count} questions: ${subject} / ${type}`);

  let cachedFallback = null;
  // 1️⃣ Check Cache (Background Caching Service)
  try {
    const cached = await getQuizCache(subject, type);
    if (cached && cached.length > 0) {
      cachedFallback = cached;
    }
    if (cached && cached.length >= count * 0.5) {
      console.log(`[Cache] ⚡ Hit! Serving ${cached.length} questions for ${subject}.`);
      return cached.slice(0, count);
    }
    console.log(`[Cache] ❄️ Miss for ${subject}, generating fresh questions...`);
  } catch (err) {
    console.warn('[Cache] Error:', err);
  }

  try {
    const batchSize = 50; // Ask for 50 questions per batch to reduce API requests (avoids 429 rate limit)
    const batches   = Math.ceil(count / batchSize);
    let all = [];

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize + 1;
      const size  = Math.min(batchSize, count - i * batchSize);
      const batch = await fetchBatch(subject, type, start, size);
      all = [...all, ...batch];
      if (i < batches - 1) await new Promise(r => setTimeout(r, 2000)); // 2-second delay between batches to respect rate limits
    }

    if (all.length > 0) {
      console.log(`✅ Total: ${all.length} questions generated`);
      saveQuizCache(subject, type, all);
      return all.slice(0, count);
    }

    // Last resort — single retry with both APIs
    console.warn('Too few questions, final retry...');
    const retry = await fetchBatch(subject, type, 1, 30);
    if (retry.length > 0) {
      saveQuizCache(subject, type, retry);
      return retry;
    }

    // Ultimate fallback — try cache even if it's small to avoid service unavailable errors
    if (cachedFallback && cachedFallback.length > 0) {
      console.warn('[Cache Fallback] AI busy. Serving ' + cachedFallback.length + ' cached questions.');
      return cachedFallback;
    }

    // Really ultimate fallback — Procedurally generate a full mock exam so the student can still practice offline
    console.error('All APIs failed. Generating smart offline mock exam.');
    const smartMockExam = [];
    for (let i = 1; i <= count; i++) {
      smartMockExam.push({
        question: `[Practice Mode] Question ${i}: Which of the following is a key concept related to ${subject} in the ${type} curriculum?`,
        options: [
          `The primary foundational principle defining the subject.`,
          `A common misconception about the topic.`,
          `An outdated theory no longer in use.`,
          `A highly specific edge case.`
        ],
        correct: 0,
        explanation: `This is an auto-generated offline practice question. Always remember the primary principles of ${subject}!`,
        answered: null
      });
    }
    return smartMockExam;

  } catch (err) {
    console.error('generateQuiz failed:', err);
    if (cachedFallback && cachedFallback.length > 0) {
      console.warn('[Cache Fallback] AI exception caught. Serving ' + cachedFallback.length + ' cached questions.');
      return cachedFallback;
    }
    return [{ question: 'API_UNAVAILABLE', options: [], correct: 0, answered: null }];
  }
};

// ── General Q&A Export ────────────────────────────────────────
export const askGeneralQuestion = async (userQuestion) => {
  const prompt = `You are a helpful and expert AI tutor for an Ethiopian educational platform. 
A student has asked the following question:
"${userQuestion}"

Please provide a clear, accurate, and highly educational answer. Break down complex topics so they are easy to understand. Keep the formatting clean and readable.`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!res.ok) throw new Error('Failed to fetch from AI service');
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate an answer at this time.";
  } catch (err) {
    console.error("askGeneralQuestion Error:", err);
    return "The AI service is currently unavailable. Please check your connection or try again later.";
  }
};
