// Flashcards Carousel & 3D Flip Interactive Module

let flashcardsData = [];
let currentCardIndex = 0;
let currentFlashcardTitle = '';

async function handleGenerateFlashcards(bookId, bookTitle) {
  switchSection('flashcards');

  const container = document.getElementById('flashcardsViewArea');
  if (!container) return;

  container.innerHTML = `
    <div class="ai-loader">
      <div class="ai-pulse-brain">
        <img src="assets/logo.svg" alt="ScholarMate AI">
      </div>
      <h3>Generating AI Flashcards for "${bookTitle}"...</h3>
      <p style="color: var(--text-muted);">Extracting core terminology, formulas, and key concepts with Gemini 2.5 Flash...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/flashcards/generate/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');

    flashcardsData = data.flashcards ? data.flashcards.cards : [];
    currentFlashcardTitle = bookTitle;
    currentCardIndex = 0;

    if (flashcardsData.length === 0) {
      container.innerHTML = `<p class="text-muted">No flashcards generated.</p>`;
      return;
    }

    renderFlashcardView();
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h3 style="color: #ef4444;">Generation Failed</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${err.message}</p>
        <button class="btn btn-secondary" onclick="switchSection('books')">⬅️ Back to Books</button>
      </div>
    `;
    showToast(err.message, 'error');
  }
}

function renderFlashcardView() {
  const container = document.getElementById('flashcardsViewArea');
  if (!container || flashcardsData.length === 0) return;

  const card = flashcardsData[currentCardIndex];

  container.innerHTML = `
    <div class="flashcards-wrapper">
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
        <h3>🃏 Flashcards: ${currentFlashcardTitle}</h3>
        <span class="badge badge-success" id="flashcardCounter">Card ${currentCardIndex + 1} of ${flashcardsData.length}</span>
      </div>

      <div class="flashcard-scene" onclick="flipCurrentCard()">
        <div class="flashcard-inner" id="flashcardInner">
          <div class="flashcard-face flashcard-front">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--brand-primary); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">QUESTION / TERM</div>
            <h2 style="font-size: 1.4rem; line-height: 1.5;">${card.front}</h2>
            <div class="flashcard-hint">💡 Click or press Space to flip</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div style="font-size: 0.85rem; font-weight: 700; opacity: 0.8; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px;">ANSWER / EXPLANATION</div>
            <p style="font-size: 1.2rem; line-height: 1.6;">${card.back}</p>
            <div class="flashcard-hint">🔄 Click or press Space to flip back</div>
          </div>
        </div>
      </div>

      <div class="flashcard-controls">
        <button class="btn btn-secondary" onclick="prevCard()" ${currentCardIndex === 0 ? 'disabled' : ''}>⬅️ Previous</button>
        <button class="btn btn-secondary" onclick="shuffleFlashcards()" title="Shuffle Deck">🔀 Shuffle</button>
        <button class="btn btn-primary" onclick="nextCard()" ${currentCardIndex === flashcardsData.length - 1 ? 'disabled' : ''}>Next ➡️</button>
      </div>
    </div>
  `;
}

function flipCurrentCard() {
  const cardInner = document.getElementById('flashcardInner');
  if (cardInner) {
    cardInner.classList.toggle('flipped');
  }
}

function nextCard() {
  if (currentCardIndex < flashcardsData.length - 1) {
    currentCardIndex++;
    renderFlashcardView();
  }
}

function prevCard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    renderFlashcardView();
  }
}

function shuffleFlashcards() {
  for (let i = flashcardsData.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flashcardsData[i], flashcardsData[j]] = [flashcardsData[j], flashcardsData[i]];
  }
  currentCardIndex = 0;
  renderFlashcardView();
  showToast('Flashcards shuffled!', 'info');
}

// Keyboard shortcuts for flashcard interaction
document.addEventListener('keydown', (e) => {
  const flashcardSec = document.getElementById('flashcards');
  if (flashcardSec && flashcardSec.style.display !== 'none' && flashcardsData.length > 0) {
    if (e.code === 'Space') {
      e.preventDefault();
      flipCurrentCard();
    } else if (e.code === 'ArrowRight') {
      nextCard();
    } else if (e.code === 'ArrowLeft') {
      prevCard();
    }
  }
});
