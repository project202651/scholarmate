// Main Dashboard Controller & Navigation

let currentUser = null;
let currentBookId = null;

function getAuthHeaders() {
  const token = localStorage.getItem('scholarmate_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

function checkAuth() {
  const token = localStorage.getItem('scholarmate_token');
  const userJson = localStorage.getItem('scholarmate_user');

  if (!token || !userJson) {
    window.location.href = 'index.html';
    return null;
  }

  try {
    currentUser = JSON.parse(userJson);
    return currentUser;
  } catch (err) {
    localStorage.removeItem('scholarmate_token');
    localStorage.removeItem('scholarmate_user');
    window.location.href = 'index.html';
    return null;
  }
}

function switchSection(sectionId) {
  const sections = document.querySelectorAll('.dashboard-section');
  sections.forEach(sec => sec.style.display = 'none');

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
  }

  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    if (link.getAttribute('data-section') === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Refresh section content if needed
  if (sectionId === 'overview') {
    loadDashboardStats();
  } else if (sectionId === 'books') {
    if (typeof loadUserBooks === 'function') loadUserBooks();
  }
}

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/dashboard/stats', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const { stats } = data;

    const elBooks = document.getElementById('statBooksCount');
    const elNotes = document.getElementById('statNotesCount');
    const elFlashcards = document.getElementById('statFlashcardsCount');
    const elScore = document.getElementById('statAvgScore');

    if (elBooks) elBooks.textContent = stats.booksUploaded || 0;
    if (elNotes) elNotes.textContent = stats.notesCreated || 0;
    if (elFlashcards) elFlashcards.textContent = stats.flashcardSets || 0;
    if (elScore) elScore.textContent = `${stats.averageQuizScore || 0}%`;

    // Render recent uploads list in overview
    const recentContainer = document.getElementById('recentBooksList');
    if (recentContainer && data.recentBooks) {
      if (data.recentBooks.length === 0) {
        recentContainer.innerHTML = `<p class="text-muted">No books uploaded yet. Go to the Upload tab to get started!</p>`;
      } else {
        recentContainer.innerHTML = data.recentBooks.map(b => `
          <div class="book-card" style="padding: 1rem;">
            <div class="book-header">
              <span class="book-file-icon">${b.file_type === 'application/pdf' ? '📄' : '🖼️'}</span>
              <div>
                <h4 style="font-size: 1rem;">${b.original_name}</h4>
                <span class="badge ${b.file_type === 'application/pdf' ? 'badge-pdf' : 'badge-image'}">${b.file_type.split('/')[1].toUpperCase()}</span>
              </div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error("Error loading dashboard stats:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (!user) return;

  // Set User Profile UI
  const userNameEl = document.getElementById('sidebarUserName');
  const userAvatarEl = document.getElementById('sidebarUserAvatar');
  if (userNameEl) userNameEl.textContent = user.username;
  if (userAvatarEl) userAvatarEl.textContent = user.username.charAt(0).toUpperCase();

  // Sidebar Links Listener
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = link.getAttribute('data-section');
      switchSection(sec);
    });
  });

  // Logout Listener
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('scholarmate_token');
      localStorage.removeItem('scholarmate_user');
      window.location.href = 'index.html';
    });
  }

  // Load initial stats
  loadDashboardStats();
});
