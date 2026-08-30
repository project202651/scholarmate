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

// Helper: Extract clean, meaningful sentences from text
function getSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => s.length >= 30 && !s.startsWith('[...'));
}

// Helper: Sample array evenly across document
function sampleEvenly(array, count) {
  if (!array || array.length === 0) return [];
  if (array.length <= count) return array;
  const step = array.length / count;
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(Math.floor(i * step), array.length - 1);
    result.push(array[idx]);
  }
  return result;
}

// Smart Local Fallback Generators (Extracts real textbook data without placeholders)
function fallbackNotes(text) {
  const sentences = getSentences(text);
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 40 && !p.startsWith('[...'));

  const sampledParagraphs = sampleEvenly(paragraphs, 3);
  const summary = sampledParagraphs.length >= 2 
    ? sampledParagraphs.join("\n\n") 
    : (sentences.slice(0, 5).join(" ") || "This uploaded textbook document contains study material covering core subject definitions, concepts, and technical processes.");

  const bullet_points = sampleEvenly(sentences, 15);
  const qSentences = sampleEvenly(sentences, 8);

  const important_questions = qSentences.map((sent) => {
    const words = sent.split(' ');
    const term = words.slice(0, 5).join(' ');
    return {
      question: `What is the significance and core explanation of "${term}" in this subject?`,
      answer: sent
    };
  });

  return { summary, bullet_points, important_questions };
}

function fallbackFlashcards(text) {
  const sentences = getSentences(text);
  const sampledSentences = sampleEvenly(sentences, 18);

  const cards = sampledSentences.map((sent) => {
    const words = sent.split(' ');
    const firstPhrase = words.slice(0, 5).join(' ');
    return {
      front: `Concept: What does the text state regarding "${firstPhrase}..."?`,
      back: sent
    };
  });

  if (cards.length === 0) {
    cards.push(
      { front: "What is the primary topic of this document?", back: text.substring(0, 250) || "Comprehensive subject study material." }
    );
  }

  return cards;
}

function fallbackQuiz(text) {
  const sentences = getSentences(text);
  const sampledSentences = sampleEvenly(sentences, 10);

  const quiz = sampledSentences.map((correctFact, i) => {
    const words = correctFact.split(' ');
    const topic = words.slice(0, 4).join(' ');

    return {
      question: `Question ${i + 1}: Which of the following statements is true regarding "${topic}" according to the textbook?`,
      options: [
        correctFact,
        `Incorrect Option: "${topic}" is not relevant to system design or academic analysis.`,
        `Incorrect Option: The textbook states that "${topic}" operates in reverse order.`,
        `Incorrect Option: This concept is restricted only to hardware interfaces.`
      ],
      correctIndex: 0,
      explanation: `Option A is correct because the textbook explicitly states: "${correctFact}"`
    };
  });

  return quiz;
}

// Core Exporter Functions
export async function generateNotes(extractedText) {
  const ai = getAiClient();
  const text = prepareText(extractedText);

  if (!ai) {
    console.log("No GEMINI_API_KEY found in .env. Analyzing entire document locally...");
    return fallbackNotes(text);
  }

  const prompt = `You are a world-class academic professor and exam creator. Thoroughly analyze the ENTIRE uploaded textbook document from the first page to the last page.

DOCUMENT CONTENT (FULL TEXT):
---
${text}
---

INSTRUCTIONS:
1. Extract deep, high-yield academic concepts, exact definitions, important formulas, historical dates, processes, and theorems present in the text.
2. Do NOT use generic placeholders or topic titles alone. Provide complete, comprehensive explanations.
3. Return ONLY valid JSON matching this schema:
{
  "summary": "Comprehensive 3-paragraph detailed summary explaining the core topics, background, and significance across the entire document.",
  "bullet_points": [
    "15-20 detailed, high-yield bullet points with complete definitions, formulas, and facts extracted from all sections of the document."
  ],
  "important_questions": [
    {
      "question": "Realistic, high-yield exam question testing deep conceptual understanding of the text",
      "answer": "Thorough, step-by-step academic answer explaining the concept in detail based on the text."
    }
  ]
}`;

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
    console.warn("Gemini API call failed, falling back to local text analyzer:", error.message);
    return fallbackNotes(text);
  }
}

export async function generateFlashcards(extractedText) {
  const ai = getAiClient();
  const text = prepareText(extractedText);

  if (!ai) {
    console.log("No GEMINI_API_KEY found in .env. Analyzing document locally for Flashcards...");
    return fallbackFlashcards(text);
  }

  const prompt = `You are an expert educational flashcard creator. Create 15 to 20 detailed, high-yield flashcards covering key terms, definitions, formulas, and concepts from the ENTIRE document.

DOCUMENT CONTENT (FULL TEXT):
---
${text}
---

INSTRUCTIONS:
1. "front" must be a specific question or term.
2. "back" must be a complete, detailed definition, formula breakdown, or explanation based on the text.
3. Do NOT use generic placeholders. Use real facts and terminology from the document.
4. Return ONLY a valid JSON array matching this schema:
[
  {
    "front": "Specific question or term from the document",
    "back": "Detailed definition, answer, or explanation"
  }
]`;

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
    console.warn("Gemini API call failed, falling back to local text analyzer:", error.message);
    return fallbackFlashcards(text);
  }
}

export async function generateQuiz(extractedText) {
  const ai = getAiClient();
  const text = prepareText(extractedText);

  if (!ai) {
    console.log("No GEMINI_API_KEY found in .env. Analyzing document locally for Quiz...");
    return fallbackQuiz(text);
  }

  const prompt = `You are a senior exam generator creating a 10-question multiple choice exam testing conceptual and analytical mastery of the ENTIRE document.

DOCUMENT CONTENT (FULL TEXT):
---
${text}
---

INSTRUCTIONS:
1. Formulate 10 challenging multiple choice questions based on actual facts, formulas, and principles in the document.
2. Provide 4 plausible options per question, where correctIndex (0, 1, 2, or 3) is the index of the correct answer.
3. Provide a thorough, educational explanation for why the correct option is right.
4. Return ONLY a valid JSON array matching this schema:
[
  {
    "question": "Challenging conceptual MCQ question",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIndex": 0,
    "explanation": "Detailed explanation referencing the document content."
  }
]`;

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
    console.warn("Gemini API call failed, falling back to local text analyzer:", error.message);
    return fallbackQuiz(text);
  }
}
