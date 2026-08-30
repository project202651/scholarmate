import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateQuiz } from '../utils/aiGenerator.js';

const router = express.Router();

// GENERATE QUIZ
router.post('/generate/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = db.prepare('SELECT id, extracted_text FROM books WHERE id = ? AND user_id = ?').get(bookId, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const forceRegenerate = req.query.force === 'true';

    const existingQuiz = db.prepare('SELECT * FROM quizzes WHERE book_id = ? AND user_id = ?').get(bookId, req.user.id);
    if (existingQuiz && !forceRegenerate) {
      return res.json({
        message: 'Existing quiz loaded',
        quiz: {
          id: existingQuiz.id,
          book_id: existingQuiz.book_id,
          questions: JSON.parse(existingQuiz.questions_json),
          score: existingQuiz.score,
          completed: existingQuiz.completed === 1,
          created_at: existingQuiz.created_at
        }
      });
    }

    if (existingQuiz && forceRegenerate) {
      db.prepare('DELETE FROM quizzes WHERE id = ?').run(existingQuiz.id);
    }

    const questions = await generateQuiz(book.extracted_text);

    const stmt = db.prepare(`
      INSERT INTO quizzes (book_id, user_id, questions_json)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(book.id, req.user.id, JSON.stringify(questions));
    const created = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Quiz generated successfully',
      quiz: {
        id: created.id,
        book_id: created.book_id,
        questions: JSON.parse(created.questions_json),
        score: created.score,
        completed: created.completed === 1,
        created_at: created.created_at
      }
    });
  } catch (error) {
    console.error('Generate quiz error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// GET QUIZ FOR A BOOK
router.get('/:bookId', authenticateToken, (req, res) => {
  try {
    const { bookId } = req.params;
    const quiz = db.prepare('SELECT * FROM quizzes WHERE book_id = ? AND user_id = ?').get(bookId, req.user.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not generated yet for this book' });
    }

    return res.json({
      quiz: {
        id: quiz.id,
        book_id: quiz.book_id,
        questions: JSON.parse(quiz.questions_json),
        score: quiz.score,
        completed: quiz.completed === 1,
        created_at: quiz.created_at
      }
    });
  } catch (error) {
    console.error('Fetch quiz error:', error);
    return res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// SUBMIT QUIZ ANSWERS & CALCULATE SCORE
router.post('/:id/submit', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of selected indices: [0, 2, 1, ...]

    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = JSON.parse(quiz.questions_json);
    let correctCount = 0;

    const results = questions.map((q, idx) => {
      const selectedIndex = answers && answers[idx] !== undefined ? answers[idx] : null;
      const isCorrect = selectedIndex === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionIndex: idx,
        question: q.question,
        selectedOption: selectedIndex !== null ? q.options[selectedIndex] : null,
        correctOption: q.options[q.correctIndex],
        isCorrect,
        explanation: q.explanation
      };
    });

    const percentageScore = Math.round((correctCount / questions.length) * 100);

    // Save score in DB
    db.prepare('UPDATE quizzes SET score = ?, completed = 1 WHERE id = ?').run(percentageScore, id);

    return res.json({
      message: 'Quiz submitted successfully',
      score: percentageScore,
      correctCount,
      totalQuestions: questions.length,
      results
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

export default router;
