// Notes Display & Book Management Module

let activeNotesData = null;

async function loadUserBooks() {
  const booksContainer = document.getElementById('booksGridContainer');
  if (!booksContainer) return;

  booksContainer.innerHTML = `
    <div class="skeleton" style="height: 180px;"></div>
    <div class="skeleton" style="height: 180px;"></div>
    <div class="skeleton" style="height: 180px;"></div>
  `;

  try {
    const res = await fetch('/api/books', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch books');

    const data = await res.json();
    const books = data.books || [];

    if (books.length === 0) {
      booksContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
          <h3>No Textbooks Uploaded Yet</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Upload your course notes, textbooks, or scanned images to automatically generate AI study materials.</p>
          <button class="btn btn-primary" onclick="switchSection('upload')">📤 Upload Textbooks</button>
        </div>
      `;
      return;
    }

    booksContainer.innerHTML = books.map(book => {
      const isPdf = book.file_type === 'application/pdf';
      return `
        <div class="book-card">
          <div class="book-header">
            <span class="book-file-icon">${isPdf ? '📄' : '🖼️'}</span>
            <div style="flex: 1; overflow: hidden;">
              <h4 style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${book.original_name}">${book.original_name}</h4>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                <span class="badge ${isPdf ? 'badge-pdf' : 'badge-image'}">${isPdf ? 'PDF' : 'IMAGE'}</span>
                <span class="stat-label">${book.page_count || 1} ${book.page_count > 1 ? 'pages' : 'page'}</span>
              </div>
            </div>
          </div>

          <div class="book-actions">
            <button class="btn btn-sm ${book.has_notes ? 'btn-secondary' : 'btn-primary'}" onclick="handleGenerateNotes(${book.id}, '${escapeQuotes(book.original_name)}')">
              ${book.has_notes ? '📝 View Notes' : '✨ Generate Notes'}
            </button>
            <button class="btn btn-sm ${book.has_flashcards ? 'btn-secondary' : 'btn-primary'}" onclick="handleGenerateFlashcards(${book.id}, '${escapeQuotes(book.original_name)}')">
              ${book.has_flashcards ? '🃏 Flashcards' : '✨ Flashcards'}
            </button>
            <button class="btn btn-sm ${book.has_quiz ? 'btn-secondary' : 'btn-primary'}" onclick="handleGenerateQuiz(${book.id}, '${escapeQuotes(book.original_name)}')">
              ${book.has_quiz ? '📋 Take Quiz' : '✨ Make Quiz'}
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteBook(${book.id})" title="Delete Book">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function handleGenerateNotes(bookId, bookTitle) {
  switchSection('notes');

  const notesContainer = document.getElementById('notesViewArea');
  if (!notesContainer) return;

  notesContainer.innerHTML = `
    <div class="ai-loader">
      <div class="ai-pulse-brain">
        <img src="assets/logo.svg" alt="ScholarMate AI">
      </div>
      <h3>Generating AI Study Notes for "${bookTitle}"...</h3>
      <p style="color: var(--text-muted);">Reading content, extracting key definitions, and synthesizing exam questions with Gemini 2.5 Flash...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/notes/generate/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate notes');

    activeNotesData = { ...data.notes, bookTitle };
    renderNotesView(activeNotesData);
  } catch (err) {
    notesContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h3 style="color: #ef4444;">Generation Failed</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${err.message}</p>
        <button class="btn btn-secondary" onclick="switchSection('books')">⬅️ Back to Books</button>
      </div>
    `;
    showToast(err.message, 'error');
  }
}

function renderNotesView(notesData) {
  const container = document.getElementById('notesViewArea');
  if (!container) return;

  const { summary, bullet_points, important_questions, bookTitle } = notesData;

  container.innerHTML = `
    <div class="notes-container">
      <div class="notes-header">
        <div>
          <h2>📝 Notes: ${bookTitle || 'Study Material'}</h2>
          <span class="badge badge-success">Generated with Gemini AI</span>
        </div>
        <button class="btn btn-secondary" onclick="downloadNotesAsText()">📥 Download Notes (.txt)</button>
      </div>

      <div class="notes-section-box">
        <h3>📌 Executive Summary</h3>
        <p style="margin-top: 0.75rem; font-size: 1.05rem; line-height: 1.7; color: var(--text-primary);">${summary}</p>
      </div>

      <div class="notes-section-box">
        <h3>⚡ Key Takeaways & Core Concepts</h3>
        <ul class="notes-bullet-list">
          ${(bullet_points || []).map(pt => `<li>${pt}</li>`).join('')}
        </ul>
      </div>

      <div class="notes-section-box">
        <h3>❓ High-Yield Exam Questions & Solutions</h3>
        <div style="margin-top: 1rem;">
          ${(important_questions || []).map((q, idx) => `
            <div class="question-accordion">
              <div style="font-weight: 700; font-size: 1rem; color: var(--brand-primary);">Q${idx + 1}: ${q.question}</div>
              <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color); color: var(--text-secondary);">
                <strong>Answer:</strong> ${q.answer}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function downloadNotesAsText() {
  if (!activeNotesData) return;

  const { summary, bullet_points, important_questions, bookTitle } = activeNotesData;

  let textContent = `==================================================\n`;
  textContent += `ScholarMate AI Study Notes\n`;
  textContent += `Textbook / Document: ${bookTitle || 'Study Material'}\n`;
  textContent += `Generated: ${new Date().toLocaleString()}\n`;
  textContent += `==================================================\n\n`;

  textContent += `--- EXECUTIVE SUMMARY ---\n\n${summary}\n\n`;

  textContent += `--- KEY TAKEAWAYS & CORE CONCEPTS ---\n\n`;
  (bullet_points || []).forEach((pt, i) => {
    textContent += `${i + 1}. ${pt}\n`;
  });

  textContent += `\n--- HIGH-YIELD EXAM QUESTIONS & SOLUTIONS ---\n\n`;
  (important_questions || []).forEach((q, i) => {
    textContent += `Q${i + 1}: ${q.question}\nAnswer: ${q.answer}\n\n`;
  });

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(bookTitle || 'Notes').replace(/[^a-zA-Z0-9]/g, '_')}_Notes.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function deleteBook(bookId) {
  if (!confirm("Are you sure you want to delete this book and all its generated notes/flashcards/quizzes?")) return;

  try {
    const res = await fetch(`/api/books/${bookId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete book');

    showToast('Book deleted successfully', 'success');
    loadUserBooks();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Load books when page initializes
  if (document.getElementById('booksGridContainer')) {
    loadUserBooks();
  }
});
