import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateFlashcards } from '../utils/aiGenerator.js';

const router = express.Router();

// GENERATE FLASHCARDS
router.post('/generate/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;

    const book = db.prepare('SELECT id, extracted_text FROM books WHERE id = ? AND user_id = ?').get(bookId, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const forceRegenerate = req.query.force === 'true';

    const existingFlashcards = db.prepare('SELECT * FROM flashcards WHERE book_id = ? AND user_id = ?').get(bookId, req.user.id);
    if (existingFlashcards && !forceRegenerate) {
      return res.json({
        message: 'Existing flashcards loaded',
        flashcards: {
          id: existingFlashcards.id,
          book_id: existingFlashcards.book_id,
          cards: JSON.parse(existingFlashcards.cards_json),
          created_at: existingFlashcards.created_at
        }
      });
    }

    if (existingFlashcards && forceRegenerate) {
      db.prepare('DELETE FROM flashcards WHERE id = ?').run(existingFlashcards.id);
    }

    const cards = await generateFlashcards(book.extracted_text);

    const stmt = db.prepare(`
      INSERT INTO flashcards (book_id, user_id, cards_json)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(book.id, req.user.id, JSON.stringify(cards));
    const created = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Flashcards generated successfully',
      flashcards: {
        id: created.id,
        book_id: created.book_id,
        cards: JSON.parse(created.cards_json),
        created_at: created.created_at
      }
    });
  } catch (error) {
    console.error('Generate flashcards error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

// GET FLASHCARDS FOR A BOOK
router.get('/:bookId', authenticateToken, (req, res) => {
  try {
    const { bookId } = req.params;
    const flashcards = db.prepare('SELECT * FROM flashcards WHERE book_id = ? AND user_id = ?').get(bookId, req.user.id);

    if (!flashcards) {
      return res.status(404).json({ error: 'Flashcards not generated yet for this book' });
    }

    return res.json({
      flashcards: {
        id: flashcards.id,
        book_id: flashcards.book_id,
        cards: JSON.parse(flashcards.cards_json),
        created_at: flashcards.created_at
      }
    });
  } catch (error) {
    console.error('Fetch flashcards error:', error);
    return res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
});

export default router;
