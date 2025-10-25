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
        });

        // Switch between forms
        document.addEventListener('click', (e) => {
            if (e.target.id === 'switchToRegister') {
                this.showRegisterForm();
            }
            if (e.target.id === 'switchToSignIn') {
                this.showSignInForm();
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
        } else {
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
                                    <input type="text" id="registerUsername" name="username" required>
                                </div>
                                <div class="form-group">
                                    <label for="registerEmail">Email</label>
                                    <input type="email" id="registerEmail" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="registerPassword">Password</label>
                                    <input type="password" id="registerPassword" name="password" required>
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

    handleSignIn() {
        const form = document.getElementById('signInFormElement');
        const formData = new FormData(form);
        const username = formData.get('username');
        const password = formData.get('password');

        // Simple validation
        if (!username || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        // Simulate API call
        this.showMessage('Signing in...', 'info');
        
        setTimeout(() => {
            // Mock authentication - in real app, this would be an API call
            if (this.validateCredentials(username, password)) {
                this.currentUser = { username, email: username + '@example.com' };
                this.isAuthenticated = true;
                this.updateUI();
                this.closeModal();
                this.showMessage('Welcome back, ' + username + '!', 'success');
            } else {
                this.showMessage('Invalid credentials. Please try again.', 'error');
            }
        }, 1000);
    }

    handleRegister() {
        const form = document.getElementById('registerFormElement');
        const formData = new FormData(form);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (!username || !password) {
            this.showMessage('Username and password are required', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        // Simulate API call
        this.showMessage('Creating account...', 'info');
        
        setTimeout(() => {
            // Mock registration - in real app, this would be an API call
            this.currentUser = { username, email: email || username + '@example.com' };
            this.isAuthenticated = true;
            this.updateUI();
            this.closeModal();
            this.showMessage('Account created successfully! Welcome, ' + username + '!', 'success');
        }, 1000);
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