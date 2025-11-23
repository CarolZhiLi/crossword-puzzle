// API_BASE is set by config.js - only set here if not already defined
if (typeof window !== 'undefined' && !window.API_BASE) {
  window.API_BASE = 'http://localhost:5050';
}

class ResetPage {
  constructor() {
    this.token = this.getToken();
    this.cacheElements();
    this.applyI18n();
    if (!this.token) {
      this.showMsg(t('reset_invalid_token'), 'error');
      if (this.el.form) this.el.form.style.display = 'none';
      return;
    }
    this.bindEvents();
  }

  cacheElements() {
    this.el = {
      msg: document.getElementById('msg'),
      form: document.getElementById('resetForm'),
      header: document.getElementById('resetHeader'),
      subtitle: document.getElementById('resetSubtitle'),
      newPasswordLabel: document.getElementById('newPasswordLabel'),
      confirmPasswordLabel: document.getElementById('confirmPasswordLabel'),
      submitBtn: document.getElementById('resetSubmitBtn'),
      backToGameBtn: document.getElementById('backToGameBtn'),
      rightPanel: document.getElementById('resetRightPanel'),
      closeBtn: document.getElementById('resetCloseBtn'),
      branding: document.getElementById('crossythinkBranding'),
    };
  }

  applyI18n() {
    try {
      const setText = (el, key) => { if (el) el.textContent = t(key); };
      setText(this.el.header, 'reset_header');
      setText(this.el.subtitle, 'reset_subtitle');
      setText(this.el.newPasswordLabel, 'reset_new_password_label');
      setText(this.el.confirmPasswordLabel, 'reset_confirm_password_label');
      setText(this.el.submitBtn, 'reset_button');
      setText(this.el.backToGameBtn, 'back_to_game');
      setText(this.el.rightPanel, 'reset_right_panel');
      setText(this.el.branding, 'crossythink_branding');
      if (this.el.closeBtn) this.el.closeBtn.setAttribute('aria-label', t('back_to_game'));
    } catch (_) {}
  }

  bindEvents() {
    if (this.el.form) {
      this.el.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  getToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }

  showMsg(text, type = 'success') {
    if (!this.el.msg) return;
    this.el.msg.textContent = text;
    this.el.msg.className = `auth-message auth-message-${type}`;
    this.el.msg.style.display = 'block';
  }

  validate(password, confirmPassword) {
    if (!password || !confirmPassword) {
      this.showMsg(t('reset_fill_fields'), 'error');
      return false;
    }
    if (password.length < 6 || password.length > 15) {
      this.showMsg(t('reset_password_length'), 'error');
      return false;
    }
    if (password !== confirmPassword) {
      this.showMsg(t('reset_passwords_no_match'), 'error');
      return false;
    }
    return true;
  }

  async handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(this.el.form);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    if (!this.validate(password, confirmPassword)) return;

    try {
      const res = await fetch(`${window.API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token, password, confirmPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('reset_failed'));
      }
      this.showMsg(t('reset_success'), 'success');
    } catch (err) {
      this.showMsg(err.message || t('reset_invalid_or_expired'), 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.ResetPage = new ResetPage();
});
