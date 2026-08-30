import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET DASHBOARD STATS
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const bookCount = db.prepare('SELECT COUNT(*) AS count FROM books WHERE user_id = ?').get(userId).count;
    const notesCount = db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?').get(userId).count;
    const flashcardsCount = db.prepare('SELECT COUNT(*) AS count FROM flashcards WHERE user_id = ?').get(userId).count;

    const quizStats = db.prepare(`
      SELECT COUNT(*) AS total_quizzes,
             SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_quizzes,
             AVG(CASE WHEN completed = 1 THEN score ELSE NULL END) AS avg_score
      FROM quizzes
      WHERE user_id = ?
    `).get(userId);

    const recentBooks = db.prepare(`
      SELECT id, original_name, file_type, uploaded_at
      FROM books
      WHERE user_id = ?
      ORDER BY uploaded_at DESC
      LIMIT 5
    `).all(userId);

    return res.json({
      stats: {
        booksUploaded: bookCount,
        notesCreated: notesCount,
        flashcardSets: flashcardsCount,
        quizzesCompleted: quizStats.completed_quizzes || 0,
        averageQuizScore: quizStats.avg_score ? Math.round(quizStats.avg_score) : 0
      },
      recentBooks
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
