import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { extractText } from '../utils/textExtractor.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|png|jpe?g|webp|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, PNG, JPG, WEBP, and TXT files are allowed.'));
    }
  }
});

// UPLOAD BOOK / DOCUMENT
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;
    const filename = req.file.filename;

    // Extract text via OCR or PDF parser
    const { text, pageCount } = await extractText(filePath, mimeType);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract readable text from the file.' });
    }

    // Save to database
    const stmt = db.prepare(`
      INSERT INTO books (user_id, filename, original_name, file_type, extracted_text, page_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(req.user.id, filename, originalName, mimeType, text, pageCount);

    const book = db.prepare('SELECT id, filename, original_name, file_type, page_count, uploaded_at FROM books WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Book uploaded and text extracted successfully',
      book: {
        ...book,
        extracted_text_preview: text.substring(0, 300) + (text.length > 300 ? '...' : '')
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// GET USER'S BOOKS
router.get('/', authenticateToken, (req, res) => {
  try {
    const books = db.prepare(`
      SELECT b.id, b.filename, b.original_name, b.file_type, b.page_count, b.uploaded_at,
             (SELECT COUNT(*) FROM notes n WHERE n.book_id = b.id) AS has_notes,
             (SELECT COUNT(*) FROM flashcards f WHERE f.book_id = b.id) AS has_flashcards,
             (SELECT COUNT(*) FROM quizzes q WHERE q.book_id = b.id) AS has_quiz
      FROM books b
      WHERE b.user_id = ?
      ORDER BY b.uploaded_at DESC
    `).all(req.user.id);

    return res.json({ books });
  } catch (error) {
    console.error('Fetch books error:', error);
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET SPECIFIC BOOK DETAILS
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    return res.json({ book });
  } catch (error) {
    console.error('Fetch book error:', error);
    return res.status(500).json({ error: 'Failed to fetch book details' });
  }
});

// DELETE A BOOK
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const book = db.prepare('SELECT filename FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete associated physical file if exists
    const filePath = path.join(uploadDir, book.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    return res.status(500).json({ error: 'Failed to delete book' });
  }
});

export default router;
