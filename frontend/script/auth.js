const API_BASE = 'http://localhost:5050';

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
            if (e.target.classList.contains('auth-modal')) {
                this.closeModal();
            }
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
                                <h2>Sign in to continue your crossword journey</h2>
                            </div>
                            <form id="signInFormElement" class="auth-form">
                                <div class="form-group">
                                    <label for="signInUsername">Username or Email</label>
                                    <input type="text" id="signInUsername" name="username" required>
                                </div>
                                <div class="form-group">
                                    <label for="signInPassword">Password</label>
                                    <input type="password" id="signInPassword" name="password" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Log In</button>
                                    <button type="button" class="btn btn-secondary" id="switchToRegister">Create Account</button>
                                </div>
                                <div class="auth-links">
                                    <a href="#" class="forgot-password">Forgot Password?</a>
                                </div>
                            </form>
                        </div>
                        <div class="auth-logo-section">
                            <div class="logo-container">
                                <img src="./assets/crossythink_logo.png" alt="CrossyThink Logo" class="modal-logo">
                                <h3>CrossyThink</h3>
                                <p>Challenge your mind with AI-powered crosswords</p>
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
                                <h2>Create your account and start solving puzzles</h2>
                            </div>
                            <form id="registerFormElement" class="auth-form">
                                <div class="form-group">
                                    <label for="registerUsername">Username</label>
                                    <input type="text" id="registerUsername" name="username" required minlength="6" maxlength="12" pattern="^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{6,12}$" title="6-12 characters, letters and numbers, must include both">
                                </div>
                                <div class="form-group">
                                    <label for="registerEmail">Email</label>
                                    <input type="email" id="registerEmail" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="registerPassword">Password</label>
                                    <input type="password" id="registerPassword" name="password" required minlength="6" maxlength="15" title="6-15 characters">
                                </div>
                                <div class="form-group">
                                    <label for="confirmPassword">Confirm Password</label>
                                    <input type="password" id="confirmPassword" name="confirmPassword" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Create Account</button>
                                    <button type="button" class="btn btn-secondary" id="switchToSignIn">Already have an account?</button>
                                </div>
                            </form>
                        </div>
                        <div class="auth-logo-section">
                            <div class="logo-container">
                                <img src="./assets/crossythink_logo.png" alt="CrossyThink Logo" class="modal-logo">
                                <h3>CrossyThink</h3>
                                <p>Challenge your mind with AI-powered crosswords</p>
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
                                <h2>Reset your password</h2>
                                <p>Enter your email or username and we’ll send a reset link.</p>
                            </div>
                            <form id="forgotPasswordFormElement" class="auth-form">
                                <div class="form-group">
                                    <label for="forgotIdentifier">Email or Username</label>
                                    <input type="text" id="forgotIdentifier" name="identifier" required>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Send Reset Link</button>
                                    <button type="button" class="btn btn-secondary" id="switchToSignIn">Back to Sign In</button>
                                </div>
                            </form>
                        </div>
                        <div class="auth-logo-section">
                            <div class="logo-container">
                                <img src="./assets/crossythink_logo.png" alt="CrossyThink Logo" class="modal-logo">
                                <h3>CrossyThink</h3>
                                <p>We’ll help you get back in.</p>
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
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        this.showMessage('Signing in...', 'info');

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }) // backend accepts username or email
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Login failed');
            }

            // Persist token for later use
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
            }

            this.currentUser = data.user;
            this.isAuthenticated = true;
            this.updateUI();
            this.closeModal();
            this.showMessage('Welcome back, ' + this.currentUser.username + '!', 'success');
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
            this.showMessage('All fields are required', 'error');
            return;
        }

        if (!this.validateUsername(username)) {
            this.showMessage('Username must be 6-12 chars, letters and numbers, and include both.', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showMessage('Password must be 6-15 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        this.showMessage('Creating account...', 'info');

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Registration failed');
            }

            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
            }

            this.currentUser = data.user;
            this.isAuthenticated = true;
            this.updateUI();
            this.closeModal();
            this.showMessage('Account created successfully! Welcome, ' + this.currentUser.username + '!', 'success');
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
            this.showMessage('Please enter your email or username', 'error');
            return;
        }

        this.showMessage('Sending reset link...', 'info');
        try {
            const payload = this.validateEmail(identifier)
                ? { email: identifier }
                : { username: identifier };

            const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to request password reset');
            }
            this.showMessage('If that account exists, a reset link has been sent.', 'success');
        } catch (err) {
            // Still show generic success to avoid enumeration
            this.showMessage('If that account exists, a reset link has been sent.', 'success');
        }
    }

    updateUI() {
        const signInBtn = document.getElementById('signInBtn');
        
        if (this.isAuthenticated) {
            signInBtn.textContent = 'Log Out';
            signInBtn.className = 'btn btn-success';
            signInBtn.onclick = () => this.signOut();
        } else {
            signInBtn.textContent = 'Log In';
            signInBtn.className = 'btn btn-primary';
            signInBtn.onclick = () => this.showSignInForm();
        }
    }

    signOut() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('token');
        this.updateUI();
        this.showMessage('You have been signed out', 'info');
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
