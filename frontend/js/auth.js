async function safeFetchJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: text || `Server returned error (${response.status})` };
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const token = localStorage.getItem('scholarmate_token');
  if (token && window.location.pathname.endsWith('index.html')) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Handle Startup Animation overlay dismiss
  const startupScreen = document.getElementById('startupScreen');
  if (startupScreen) {
    setTimeout(() => {
      startupScreen.classList.add('fade-out');
      setTimeout(() => {
        startupScreen.style.display = 'none';
      }, 800);
    }, 2400);
  }

  // Auth Tabs (Login vs Signup toggle)
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginTab && signupTab && loginForm && signupForm) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    });

    signupTab.addEventListener('click', () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.style.display = 'block';
      loginForm.style.display = 'none';
    });
  }

  // LOGIN Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
      }

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await safeFetchJson(response);

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        localStorage.setItem('scholarmate_token', data.token);
        localStorage.setItem('scholarmate_user', JSON.stringify(data.user));

        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // SIGNUP Submission
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('signupUsername').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;

      if (!username || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });

        const data = await safeFetchJson(response);

        if (!response.ok) {
          throw new Error(data.error || 'Signup failed');
        }

        localStorage.setItem('scholarmate_token', data.token);
        localStorage.setItem('scholarmate_user', JSON.stringify(data.user));

        showToast('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});
