// Quiz Interactive Engine & Scoring Module

let quizData = null;
let currentQuizId = null;
let userAnswers = {};
let currentQuestionIdx = 0;
let quizTitle = '';

async function handleGenerateQuiz(bookId, bookTitle) {
  switchSection('quiz');

  const container = document.getElementById('quizViewArea');
  if (!container) return;

  container.innerHTML = `
    <div class="ai-loader">
      <div class="ai-pulse-brain">
        <img src="assets/logo.svg" alt="ScholarMate AI">
      </div>
      <h3>Generating AI Quiz for "${bookTitle}"...</h3>
      <p style="color: var(--text-muted);">Constructing 10 high-yield multiple choice questions with detailed explanations using Gemini 2.5 Flash...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/quizzes/generate/${bookId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await safeFetchJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');

    quizData = data.quiz;
    currentQuizId = quizData.id;
    quizTitle = bookTitle;
    userAnswers = {};
    currentQuestionIdx = 0;

    renderQuizQuestion();
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

function renderQuizQuestion() {
  const container = document.getElementById('quizViewArea');
  if (!container || !quizData || !quizData.questions) return;

  const questions = quizData.questions;
  const q = questions[currentQuestionIdx];
  const progressPercent = Math.round(((currentQuestionIdx + 1) / questions.length) * 100);

  container.innerHTML = `
    <div class="quiz-wrapper">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3>📋 Quiz: ${quizTitle}</h3>
        <span class="badge badge-success">Question ${currentQuestionIdx + 1} of ${questions.length}</span>
      </div>

      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.25rem; line-height: 1.5; color: var(--text-primary);">
          ${currentQuestionIdx + 1}. ${q.question}
        </h3>
      </div>

      <div class="options-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${q.options.map((opt, optIdx) => {
          const isSelected = userAnswers[currentQuestionIdx] === optIdx;
          return `
            <div class="option-card ${isSelected ? 'selected' : ''}" onclick="selectQuizOption(${optIdx})">
              <input type="radio" name="quizOpt" ${isSelected ? 'checked' : ''} style="pointer-events: none;">
              <span style="font-size: 1rem; color: var(--text-primary);">${opt}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 2rem;">
        <button class="btn btn-secondary" onclick="prevQuizQuestion()" ${currentQuestionIdx === 0 ? 'disabled' : ''}>⬅️ Previous</button>
        ${currentQuestionIdx < questions.length - 1 ? `
          <button class="btn btn-primary" onclick="nextQuizQuestion()">Next Question ➡️</button>
        ` : `
          <button class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669);" onclick="submitQuiz()">🚀 Submit Quiz</button>
        `}
      </div>
    </div>
  `;
}

function selectQuizOption(optionIndex) {
  userAnswers[currentQuestionIdx] = optionIndex;
  renderQuizQuestion();
}

function nextQuizQuestion() {
  if (currentQuestionIdx < quizData.questions.length - 1) {
    currentQuestionIdx++;
    renderQuizQuestion();
  }
}

function prevQuizQuestion() {
  if (currentQuestionIdx > 0) {
    currentQuestionIdx--;
    renderQuizQuestion();
  }
}

async function submitQuiz() {
  const container = document.getElementById('quizViewArea');
  if (!container || !currentQuizId) return;

  const totalQuestions = quizData.questions.length;
  const answeredCount = Object.keys(userAnswers).length;

  if (answeredCount < totalQuestions) {
    if (!confirm(`You answered ${answeredCount} of ${totalQuestions} questions. Are you sure you want to submit?`)) {
      return;
    }
  }

  container.innerHTML = `
    <div class="ai-loader">
      <div class="ai-pulse-brain">
        <img src="assets/logo.svg" alt="ScholarMate">
      </div>
      <h3>Calculating Your Score...</h3>
    </div>
  `;

  try {
    const res = await fetch(`/api/quizzes/${currentQuizId}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers: userAnswers })
    });

    const data = await safeFetchJson(res);
    if (!res.ok) throw new Error(data.error || 'Quiz submission failed');

    renderQuizResults(data);
    loadDashboardStats(); // Refresh stats header
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderQuizResults(resultsData) {
  const container = document.getElementById('quizViewArea');
  if (!container) return;

  const { score, correctCount, totalQuestions, results } = resultsData;

  container.innerHTML = `
    <div class="quiz-wrapper">
      <div class="score-card">
        <div class="score-circle">
          <div>${score}%</div>
          <span style="font-size: 0.75rem; font-weight: 400; opacity: 0.9;">SCORE</span>
        </div>
        <h2>${score >= 80 ? '🎉 Outstanding Performance!' : score >= 60 ? '👍 Good Job!' : '📚 Keep Practicing!'}</h2>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">
          You scored <strong>${correctCount}</strong> out of <strong>${totalQuestions}</strong> correctly on <strong>${quizTitle}</strong>.
        </p>

        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-primary" onclick="handleGenerateQuiz(${quizData.book_id}, '${escapeQuotes(quizTitle)}')">🔄 Retake Quiz</button>
          <button class="btn btn-secondary" onclick="switchSection('books')">📚 Back to Books</button>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;">

      <h3>Detailed Answer Key & AI Explanations</h3>
      <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
        ${(results || []).map((r, idx) => `
          <div class="question-accordion" style="border-left: 4px solid ${r.isCorrect ? '#10b981' : '#ef4444'};">
            <div style="font-weight: 700; font-size: 1rem;">
              ${r.isCorrect ? '✅' : '❌'} Question ${idx + 1}: ${r.question}
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.95rem;">
              <div><strong>Your Answer:</strong> <span style="color: ${r.isCorrect ? '#10b981' : '#ef4444'}">${r.selectedOption || 'Not Answered'}</span></div>
              ${!r.isCorrect ? `<div><strong>Correct Answer:</strong> <span style="color: #10b981">${r.correctOption}</span></div>` : ''}
              <div style="margin-top: 0.5rem; background: var(--bg-card); padding: 0.75rem; border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.9rem;">
                💡 <strong>Explanation:</strong> ${r.explanation}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
