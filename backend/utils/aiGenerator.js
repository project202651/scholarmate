import { GoogleGenAI } from '@google/genai';

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Clean JSON response string from potential markdown code blocks
function cleanJsonResponse(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

// Preserve FULL document content up to 500,000 characters (~125,000 words).
// If longer, sample evenly across beginning, middle, and end so no chapter is missed.
function prepareText(text, maxChars = 500000) {
  if (!text) return '';
  if (text.length <= maxChars) {
    return text;
  }

  const partSize = Math.floor(maxChars / 3);
  const beginning = text.substring(0, partSize);
  const middleStart = Math.floor((text.length - partSize) / 2);
  const middle = text.substring(middleStart, middleStart + partSize);
  const end = text.substring(text.length - partSize);

  return `${beginning}\n\n[...Middle Document Content...]\n\n${middle}\n\n[...Ending Document Content...]\n\n${end}`;
}

// Helper: Extract clean sentences from text
function getSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length > 25);
}

// Helper: Evenly sample array across entire document length
function sampleEvenly(array, count) {
  if (array.length <= count) return array;
  const step = array.length / count;
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(Math.floor(i * step), array.length - 1);
    result.push(array[idx]);
  }
  return result;
}

// Smart Local Fallback Generators (samples evenly across ENTIRE document from start to end)
function fallbackNotes(text) {
  const sentences = getSentences(text);
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 30);

  // Sample paragraphs from beginning, middle, and end
  const sampledParagraphs = sampleEvenly(paragraphs, 4);
  const summary = sampledParagraphs.length >= 2 
    ? sampledParagraphs.join("\n\n") 
    : (sentences.slice(0, 5).join(" ") || "The uploaded textbook contains comprehensive study material covering core academic concepts, definitions, and technical principles across all chapters.");

  // Sample 15 key sentences evenly across the entire document
  const bullet_points = sampleEvenly(sentences, 15);

  // Sample 8 questions evenly across the entire document
  const qSentences = sampleEvenly(sentences, 8);
  const important_questions = qSentences.map((sent, i) => {
    const words = sent.split(' ');
    const term = words.slice(0, 4).join(' ');
    return {
      question: `What is the significance of "${term}..." as discussed in Section ${i + 1}?`,
      answer: sent
    };
  });

  return { summary, bullet_points, important_questions };
}

function fallbackFlashcards(text) {
  const sentences = getSentences(text);
  const sampledSentences = sampleEvenly(sentences, 18);

  const cards = sampledSentences.map((sent, i) => {
    const words = sent.split(' ');
    const keyTerm = words.slice(0, 3).join(' ');
    return {
      front: `[Chapter Topic ${i + 1}] What is the core definition or concept of "${keyTerm}..."?`,
      back: sent
    };
  });

  if (cards.length === 0) {
    cards.push(
      { front: "What is the primary topic of this study material?", back: "The uploaded textbook covers core subject principles, definitions, and analytical concepts." },
      { front: "What key methodology is explained in the text?", back: "Detailed theoretical and practical problem-solving approaches discussed in the material." }
    );
  }

  return cards;
}

function fallbackQuiz(text) {
  const sentences = getSentences(text);
  const sampledSentences = sampleEvenly(sentences, 10);

  const quiz = sampledSentences.map((correctFact, i) => {
    const words = correctFact.split(' ');
    const topic = words.slice(0, 3).join(' ');
    return {
      question: `Question ${i + 1} (Document Analysis): Which statement correctly describes "${topic}..." as explained in the text?`,
      options: [
        correctFact,
        `Option B: Incorrect statement contradicting the textbook findings for ${topic}.`,
        `Option C: Unrelated principle not supported by the document analysis.`,
        `Option D: Distractor option presenting an inaccurate formula or definition.`
      ],
      correctIndex: 0,
      explanation: `Option A is correct because it directly reflects the textbook text: "${correctFact}"`
    };
  });

  return quiz;
}

// Core Exporter Functions
export async function generateNotes(extractedText) {
  const ai = getAiClient();
  const text = prepareText(extractedText);

  if (!ai) {
    console.log("No GEMINI_API_KEY found in .env. Analyzing entire document locally across all sections...");
    return fallbackNotes(text);
  }

  const prompt = `You are an expert AI academic tutor. Analyze the ENTIRE provided textbook/document content thoroughly from beginning to end (all sections, chapters, and topics).

Target Output JSON Schema:
{
  "summary": "Detailed 2-3 paragraph comprehensive summary of the main topics, background, and significance across the entire document.",
  "bullet_points": [
    "15-20 detailed, high-yield bullet points covering definitions, key formulas, theorems, main arguments, or processes from EVERY chapter/section of the document."
  ],
  "important_questions": [
    {
      "question": "Clear, exam-style conceptual or analytical question derived from the document",
      "answer": "Complete, accurate answer with thorough explanation"
    }
  ]
}

Document Content (FULL TEXT):
---
${text}
---

CRITICAL: Read and analyze the WHOLE text, ensuring concepts from the start, middle, and end of the document are represented in your output. Return ONLY valid JSON matching the target schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const rawText = response.text || '';
    const cleaned = cleanJsonResponse(rawText);
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || "Summary generation completed.",
      bullet_points: Array.isArray(parsed.bullet_points) ? parsed.bullet_points : [],
      important_questions: Array.isArray(parsed.important_questions) ? parsed.important_questions : []
    };
  } catch (error) {
    console.warn("Gemini API call failed, falling back to local full-document text analyzer:", error.message);
    return fallbackNotes(text);
  }
}

export async function generateFlashcards(extractedText) {
  const ai = getAiClient();
  const text = prepareText(extractedText);

  if (!ai) {
    console.log("No GEMINI_API_KEY found in .env. Analyzing entire document locally for Flashcards...");
    return fallbackFlashcards(text);
  }

  const prompt = `You are an expert educational flashcard creator. Create 15 to 20 flashcards covering concepts across the ENTIRE provided document (from beginning to end).

Target Output JSON Schema:
[
  {
    "front": "Clear question, term, formula, or key concept",
    "back": "Detailed definition, explanation, answer, or formula breakdown"
  }
]

Document Content (FULL TEXT):
---
${text}
---

CRITICAL: Ensure flashcards span all sections and chapters of the document. Return ONLY valid JSON array matching the target schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const rawText = response.text || '';
    const cleaned = cleanJsonResponse(rawText);
    const parsed = JSON.parse(cleaned);

    return Array.isArray(parsed) ? parsed : fallbackFlashcards(text);
  } catch (error) {
    console.warn("Gemini API call failed, falling back to local full-document text analyzer:", error.message);
    return fallbackFlashcards(text);
  }
}

export async function generateQuiz(extractedText) {
  const ai = getAiClient();
  const text = prepareText(extractedText);

  if (!ai) {
    console.log("No GEMINI_API_KEY found in .env. Analyzing entire document locally for Quiz...");
    return fallbackQuiz(text);
  }

  const prompt = `You are an exam generator creating a high-quality multiple choice quiz (10 questions) based on the ENTIRE document provided.

Target Output JSON Schema:
[
  {
    "question": "Challenging MCQ question testing conceptual understanding",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed explanation of why Option A is correct and why other options are incorrect."
  }
]

Document Content (FULL TEXT):
---
${text}
---

Rules:
1. Questions MUST cover topics from the start, middle, and end of the document.
2. Provide exactly 4 options per question.
3. 'correctIndex' must be an integer (0, 1, 2, or 3).
4. Return ONLY valid JSON array matching the target schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const rawText = response.text || '';
    const cleaned = cleanJsonResponse(rawText);
    const parsed = JSON.parse(cleaned);

    return Array.isArray(parsed) ? parsed : fallbackQuiz(text);
  } catch (error) {
    console.warn("Gemini API call failed, falling back to local full-document text analyzer:", error.message);
    return fallbackQuiz(text);
  }
}
