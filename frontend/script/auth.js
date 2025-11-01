window.API_BASE = window.API_BASE || 'http://localhost:5050';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Log In button click handler
        document.getElementById('signInBtn').addEventListener('click', () => {
            this.showSignInForm();
        });

        // Close modal handlers
        document.addEventListener('click', (e) => {
            // if (e.target.classList.contains('auth-modal')) {
            //     this.closeModal();
            // }
            if (e.target.classList.contains('close-btn')) {
                this.closeModal();
            }
        });

        // Form submission handlers
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'signInFormElement') {
                e.preventDefault();
                this.handleSignIn();
            }
            if (e.target.id === 'registerFormElement') {
                e.preventDefault();
                this.handleRegister();
            }
            if (e.target.id === 'forgotPasswordFormElement') {
                e.preventDefault();
                this.handleForgotPassword();
            }
        });

        // Switch between forms
        document.addEventListener('click', (e) => {
            if (e.target.id === 'switchToRegister') {
                this.showRegisterForm();
            }
            if (e.target.id === 'switchToSignIn') {
                this.showSignInForm();
            }
            if (e.target.classList.contains('forgot-password')) {
                e.preventDefault();
                this.showForgotPasswordForm();
            }
        });
    }

    showSignInForm() {
        this.createModal('signIn');
    }

    showRegisterForm() {
        this.createModal('register');
    }

    createModal(type = 'signIn') {
        // Remove existing modal if any
        const existingModal = document.querySelector('.auth-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.innerHTML = this.getModalHTML(type);
        
        document.body.appendChild(modal);
        
        // Add animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    getModalHTML(type) {
        if (type === 'signIn') {
            return `
                <div class="auth-modal-content">
                    <button class="close-btn">&times;</button>
                    <div class="auth-modal-body">
                        <div class="auth-form-section">
                            <div class="auth-form-header">
                                <h2>${t('signin_title')}</h2>
                            </div>
                            <form id="signInFormElement" class="auth-form">
                                <div class="form-group">
                                    <label for="signInUsername">${t('username_or_email')}</label>
                                    <input type="text" id="signInUsername" name="username" required>
                                </div>
                                <div class="form-group">
                                    <label for="signInPassword">${t('password')}</label>
                                    <input type="password" id="signInPassword" name="password" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">${t('login')}</button>
                                    <button type="button" class="btn btn-secondary" id="switchToRegister">${t('create_account')}</button>
                                </div>
                                <div class="auth-links">
                                    <a href="#" class="forgot-password">${t('forgot_password_link')}</a>
                                </div>
                            </form>
                        </div>
                        <div class="auth-logo-section">
                            <div class="logo-container">
                                <img src="./assets/crossythink_logo.png" alt="CrossyThink Logo" class="modal-logo">
                                <h3>${t('brand_name')}</h3>
                                <p>${t('brand_tagline')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'register') {
            return `
                <div class="auth-modal-content">
                    <button class="close-btn">&times;</button>
                    <div class="auth-modal-body">
                        <div class="auth-form-section">
                            <div class="auth-form-header">
                                <h2>${t('register_title')}</h2>
                            </div>
                            <form id="registerFormElement" class="auth-form">
                                <div class="form-group">
                                    <label for="registerUsername">${t('username')}</label>
                                    <input type="text" id="registerUsername" name="username" required minlength="6" maxlength="12" pattern="^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{6,12}$" title="6-12 characters, letters and numbers, must include both">
                                </div>
                                <div class="form-group">
                                    <label for="registerEmail">${t('email')}</label>
                                    <input type="email" id="registerEmail" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="registerPassword">${t('password')}</label>
                                    <input type="password" id="registerPassword" name="password" required minlength="6" maxlength="15" title="6-15 characters">
                                </div>
                                <div class="form-group">
                                    <label for="confirmPassword">${t('confirm_password')}</label>
                                    <input type="password" id="confirmPassword" name="confirmPassword" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">${t('create_account')}</button>
                                    <button type="button" class="btn btn-secondary" id="switchToSignIn">${t('already_have_account')}</button>
                                </div>
                            </form>
                        </div>
                        <div class="auth-logo-section">
                            <div class="logo-container">
                                <img src="./assets/crossythink_logo.png" alt="CrossyThink Logo" class="modal-logo">
                                <h3>${t('brand_name')}</h3>
                                <p>${t('brand_tagline')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'forgot') {
            return `
                <div class="auth-modal-content">
                    <button class="close-btn">&times;</button>
                    <div class="auth-modal-body">
                        <div class="auth-form-section">
                            <div class="auth-form-header">
                                <h2>${t('forgot_title')}</h2>
                                <p>${t('forgot_instructions')}</p>
                            </div>
                            <form id="forgotPasswordFormElement" class="auth-form">
                                <div class="form-group">
                                    <label for="forgotIdentifier">${t('email_or_username')}</label>
                                    <input type="text" id="forgotIdentifier" name="identifier" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">${t('send_reset_link')}</button>
                                    <button type="button" class="btn btn-secondary" id="switchToSignIn">${t('back_to_signin')}</button>
                                </div>
                            </form>
                        </div>
                        <div class="auth-logo-section">
                            <div class="logo-container">
                                <img src="./assets/crossythink_logo.png" alt="CrossyThink Logo" class="modal-logo">
                                <h3>${t('brand_name')}</h3>
                                <p>${t('reset_right_panel')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return '';
        }
    }

    closeModal() {
        const modal = document.querySelector('.auth-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    async handleSignIn() {
        const form = document.getElementById('signInFormElement');
        const formData = new FormData(form);
        const username = formData.get('username');
        const password = formData.get('password');

        // Simple validation
        if (!username || !password) {
            this.showMessage(t('fill_all_fields'), 'error');
            return;
        }

        this.showMessage(t('signing_in'), 'info');

        try {
            const res = await fetch(`${window.API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }) // backend accepts username or email
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || t('login_failed'));
            }

            // Persist token and user for later use
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
            }
            if (data.user) {
                try { localStorage.setItem('user', JSON.stringify(data.user)); } catch (_) {}
            }

            this.currentUser = data.user;
            this.isAuthenticated = true;
            this.updateUI();
            this.closeModal();
            // Show usage if provided
            try {
                const apiUsageEl = document.getElementById('apiUsage');
                const total = Number((data.usage && data.usage.total_calls) || 0);
                if (apiUsageEl && Number.isFinite(total)) {
                    apiUsageEl.textContent = `API used: ${total}`;
                    apiUsageEl.style.display = 'inline-block';
                }
            } catch (_) {}
            this.showMessage(t('welcome_back', { username: this.currentUser.username }), 'success');
        } catch (err) {
            this.showMessage(err.message, 'error');
        }
    }

    async handleRegister() {
        const form = document.getElementById('registerFormElement');
        const formData = new FormData(form);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Frontend Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showMessage(t('all_fields_required'), 'error');
            return;
        }

        if (!this.validateUsername(username)) {
            this.showMessage(t('username_requirements'), 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showMessage(t('invalid_email'), 'error');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showMessage(t('password_requirements'), 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage(t('passwords_no_match'), 'error');
            return;
        }

        this.showMessage(t('creating_account'), 'info');

        try {
            const res = await fetch(`${window.API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || t('registration_failed'));
            }

            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
            }
            if (data.user) {
                try { localStorage.setItem('user', JSON.stringify(data.user)); } catch (_) {}
            }

            this.currentUser = data.user;
            this.isAuthenticated = true;
            this.updateUI();
            this.closeModal();
            try {
                const apiUsageEl = document.getElementById('apiUsage');
                const total = Number((data.usage && data.usage.total_calls) || 0);
                if (apiUsageEl && Number.isFinite(total)) {
                    apiUsageEl.textContent = `API used: ${total}`;
                    apiUsageEl.style.display = 'inline-block';
                }
            } catch (_) {}
            this.showMessage(t('account_created_welcome', { username: this.currentUser.username }), 'success');
        } catch (err) {
            this.showMessage(err.message, 'error');
        }
    }

    validateCredentials(username, password) {
        // Mock validation - in real app, this would check against database
        const validUsers = {
            'admin': 'password123',
            'user': 'password123',
            'test': 'test123'
        };
        return validUsers[username] === password;
    }

    // Frontend validators matching backend rules
    validateUsername(username) {
        if (!username) return false;
        if (username.length < 6 || username.length > 12) return false;
        const alnum = /^[A-Za-z0-9]+$/;
        if (!alnum.test(username)) return false;
        const hasLetter = /[A-Za-z]/.test(username);
        const hasDigit = /\d/.test(username);
        return hasLetter && hasDigit;
    }

    validateEmail(email) {
        if (!email) return false;
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    validatePassword(password) {
        if (!password) return false;
        return password.length >= 6 && password.length <= 15;
    }

    showForgotPasswordForm() {
        this.createModal('forgot');
    }

    async handleForgotPassword() {
        const form = document.getElementById('forgotPasswordFormElement');
        const formData = new FormData(form);
        const identifier = formData.get('identifier');

        if (!identifier) {
            this.showMessage(t('enter_email_or_username'), 'error');
            return;
        }

        this.showMessage(t('sending_reset_link'), 'info');
        try {
            const payload = this.validateEmail(identifier)
                ? { email: identifier }
                : { username: identifier };

            const res = await fetch(`${window.API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || t('reset_failed'));
            }
            this.showMessage(t('reset_link_generic_ok'), 'success');
        } catch (err) {
            // Still show generic success to avoid enumeration
            this.showMessage(t('reset_link_generic_ok'), 'success');
        }
    }

    updateUI() {
        const signInBtn = document.getElementById('signInBtn');
        const apiUsageEl = document.getElementById('apiUsage');
        
        if (this.isAuthenticated) {
            signInBtn.textContent = t('logout');
            signInBtn.className = 'btn btn-success';
            signInBtn.onclick = () => this.signOut();

            // Fetch and display usage for current user
            try {
                const token = localStorage.getItem('token');
                if (token && apiUsageEl) {
                    fetch(`${window.API_BASE}/api/usage/me`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(r => r.json().then(data => ({ ok: r.ok, data })))
                    .then(({ ok, data }) => {
                        if (ok && data && data.success && data.usage) {
                            const total = Number(data.usage.total_calls || 0);
                            apiUsageEl.textContent = `API used: ${total}`;
                            apiUsageEl.style.display = 'inline-block';
                            // Admin: make clickable to view all usage
                            try {
                                let user = null;
                                try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch (_) {}
                                if (user && user.role === 'admin') {
                                    apiUsageEl.style.cursor = 'pointer';
                                    apiUsageEl.title = 'Click to view usage by user';
                                    apiUsageEl.onclick = () => {
                                        fetch(`${window.API_BASE}/api/usage/all`, {
                                            method: 'GET',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        }).then(r => r.json().then(d => ({ ok: r.ok, data: d })))
                                        .then(({ ok, data: all }) => {
                                            if (!ok || !all || !all.success) return;
                                            const lines = (all.results || []).slice(0, 10).map((row, i) => `${i+1}. ${row.username}: ${row.total_calls}`);
                                            alert(['Top usage', ...lines].join('\n'));
                                        }).catch(() => {});
                                    };
                                } else {
                                    apiUsageEl.onclick = null;
                                    apiUsageEl.style.cursor = 'default';
                                }
                            } catch (_) {}
                        } else {
                            if (apiUsageEl) apiUsageEl.style.display = 'none';
                        }
                    }).catch(() => { if (apiUsageEl) apiUsageEl.style.display = 'none'; });
                } else if (apiUsageEl) {
                    apiUsageEl.style.display = 'none';
                }
            } catch (_) {}
        } else {
            signInBtn.textContent = t('login');
            signInBtn.className = 'btn btn-primary';
            signInBtn.onclick = () => this.showSignInForm();
            if (apiUsageEl) apiUsageEl.style.display = 'none';
        }
    }

    signOut() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateUI();
        this.showMessage(t('signed_out'), 'info');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message auth-message-${type}`;
        messageDiv.textContent = message;
        
        const modal = document.querySelector('.auth-modal-content');
        if (modal) {
            modal.insertBefore(messageDiv, modal.firstChild);
        }

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
