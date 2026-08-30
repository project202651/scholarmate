// File Upload Controller (Drag & Drop + Multer API)

async function uploadFile(file) {
  const uploadProgress = document.getElementById('uploadProgress');
  const progressBarFill = document.getElementById('progressBarFill');
  const uploadStatusText = document.getElementById('uploadStatusText');

  if (uploadProgress) uploadProgress.style.display = 'block';
  if (progressBarFill) progressBarFill.style.width = '30%';
  if (uploadStatusText) uploadStatusText.textContent = `Extracting text from ${file.name}... (This may take a few seconds)`;

  const formData = new FormData();
  formData.append('document', file);

  const token = localStorage.getItem('scholarmate_token');

  try {
    const response = await fetch('/api/books/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (progressBarFill) progressBarFill.style.width = '80%';

    const data = await safeFetchJson(response);

    if (!response.ok) {
      throw new Error(data.error || 'File upload failed');
    }

    if (progressBarFill) progressBarFill.style.width = '100%';
    if (uploadStatusText) uploadStatusText.textContent = 'Upload & text extraction complete!';

    showToast(`Successfully processed "${file.name}"!`, 'success');

    setTimeout(() => {
      if (uploadProgress) uploadProgress.style.display = 'none';
      if (progressBarFill) progressBarFill.style.width = '0%';
      // Navigate to My Books tab
      if (typeof switchSection === 'function') {
        switchSection('books');
      }
    }, 1200);

  } catch (err) {
    if (uploadProgress) uploadProgress.style.display = 'none';
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadFile(e.target.files[0]);
      }
    });
  }
});
