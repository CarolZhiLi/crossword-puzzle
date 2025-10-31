window.API_BASE = window.API_BASE || 'http://localhost:5050';

function showMsg(text, type = 'success') {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = `auth-message auth-message-${type}`;
  el.style.display = 'block';
}

function getToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  if (!token) {
    showMsg('Invalid or missing reset token.', 'error');
    document.getElementById('resetForm').style.display = 'none';
    return;
  }

  const form = document.getElementById('resetForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!password || !confirmPassword) {
      showMsg('Please fill in all fields.', 'error');
      return;
    }
    if (password.length < 6 || password.length > 15) {
      showMsg('Password must be 6-15 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showMsg('Passwords do not match.', 'error');
      return;
    }

    try {
      const res = await fetch(`${window.API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reset failed');
      }
      showMsg('Password reset successful. You can now sign in.', 'success');
    } catch (err) {
      showMsg(err.message || 'Invalid or expired token.', 'error');
    }
  });
});
