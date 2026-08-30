import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateNotes } from '../utils/aiGenerator.js';

const router = express.Router();

// GENERATE NOTES FOR A BOOK
router.post('/generate/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = db.prepare('SELECT id, extracted_text, original_name FROM books WHERE id = ? AND user_id = ?').get(bookId, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const forceRegenerate = req.query.force === 'true';

    // Check if notes already exist (unless force regenerate is requested)
    const existingNotes = db.prepare('SELECT * FROM notes WHERE book_id = ? AND user_id = ?').get(bookId, req.user.id);
    if (existingNotes && !forceRegenerate) {
      return res.json({
        message: 'Existing notes loaded',
        notes: {
          id: existingNotes.id,
          book_id: existingNotes.book_id,
          summary: existingNotes.summary,
          bullet_points: JSON.parse(existingNotes.bullet_points),
          important_questions: JSON.parse(existingNotes.important_questions),
          created_at: existingNotes.created_at
        }
      });
    }

    if (existingNotes && forceRegenerate) {
      db.prepare('DELETE FROM notes WHERE id = ?').run(existingNotes.id);
    }

    // Generate notes using Gemini
    const aiOutput = await generateNotes(book.extracted_text);

    const stmt = db.prepare(`
      INSERT INTO notes (book_id, user_id, summary, bullet_points, important_questions)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      book.id,
      req.user.id,
      aiOutput.summary,
      JSON.stringify(aiOutput.bullet_points),
      JSON.stringify(aiOutput.important_questions)
    );

    const createdNotes = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Notes generated successfully',
      notes: {
        id: createdNotes.id,
        book_id: createdNotes.book_id,
        summary: createdNotes.summary,
        bullet_points: JSON.parse(createdNotes.bullet_points),
        important_questions: JSON.parse(createdNotes.important_questions),
        created_at: createdNotes.created_at
      }
    });
  } catch (error) {
    console.error('Generate notes error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate notes' });
  }
});

// GET NOTES FOR A BOOK
router.get('/:bookId', authenticateToken, (req, res) => {
  try {
    const { bookId } = req.params;
    const notes = db.prepare('SELECT * FROM notes WHERE book_id = ? AND user_id = ?').get(bookId, req.user.id);

    if (!notes) {
      return res.status(404).json({ error: 'Notes not generated yet for this book' });
    }

    return res.json({
      notes: {
        id: notes.id,
        book_id: notes.book_id,
        summary: notes.summary,
        bullet_points: JSON.parse(notes.bullet_points),
        important_questions: JSON.parse(notes.important_questions),
        created_at: notes.created_at
      }
    });
  } catch (error) {
    console.error('Fetch notes error:', error);
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

export default router;
