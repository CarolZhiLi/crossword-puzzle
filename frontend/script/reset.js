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
  // Apply i18n to static texts
  try {
    const setText = (id, key) => { const n = document.getElementById(id); if (n) n.textContent = t(key); };
    setText('resetHeader', 'reset_header');
    setText('resetSubtitle', 'reset_subtitle');
    setText('newPasswordLabel', 'reset_new_password_label');
    setText('confirmPasswordLabel', 'reset_confirm_password_label');
    setText('resetSubmitBtn', 'reset_button');
    setText('backToGameBtn', 'back_to_game');
    setText('resetRightPanel', 'reset_right_panel');
    const closeBtn = document.getElementById('resetCloseBtn');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('back_to_game'));
  } catch (_) {}

  const token = getToken();
  if (!token) {
    showMsg(t('reset_invalid_token'), 'error');
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
      showMsg(t('reset_fill_fields'), 'error');
      return;
    }
    if (password.length < 6 || password.length > 15) {
      showMsg(t('reset_password_length'), 'error');
      return;
    }
    if (password !== confirmPassword) {
      showMsg(t('reset_passwords_no_match'), 'error');
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
        throw new Error(data.error || t('reset_failed'));
      }
      showMsg(t('reset_success'), 'success');
    } catch (err) {
      showMsg(err.message || t('reset_invalid_or_expired'), 'error');
    }
  });
});
