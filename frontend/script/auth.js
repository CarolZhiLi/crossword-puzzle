// API_BASE is set by config.js. Do not hardcode here.
(function () {
  if (typeof window !== "undefined" && !window.API_BASE) {
    window.API_BASE = "http://localhost:5050";
  }
})();

class AuthManager {
  constructor() {
    this.currentUser = null;
    // Auth is derived from server-side JWT httpOnly cookie via /auth/me
    this.isAuthenticated = false;
    this.bindUI();
    this.refreshAuthState();
  }

  bindUI() {
    const signInBtn = document.getElementById("signInBtn");
    if (signInBtn) {
      // Don't set onclick here - it will be set in updateUI() based on auth state
    }

    const mobileSignInBtn = document.getElementById("mobileSignInBtn");
    if (mobileSignInBtn) {
      // Don't set onclick here - it will be set in updateUI() based on auth state
    }

    const tabletSignInBtn = document.getElementById("tabletSignInBtn");
    if (tabletSignInBtn) {
      // Don't set onclick here - it will be set in updateUI() based on auth state
    }

    document.addEventListener("click", (e) => {
      if (e.target.classList?.contains("close-btn")) this.closeModal();
    });

    document.addEventListener("submit", (e) => {
      if (e.target.id === "signInFormElement") {
        e.preventDefault();
        this.handleSignIn(e);
      }
      if (e.target.id === "registerFormElement") {
        e.preventDefault();
        this.handleRegister(e);
      }
      if (e.target.id === "forgotPasswordFormElement") {
        e.preventDefault();
        this.handleForgotPassword(e);
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.id === "switchToRegister") this.showRegisterForm();
      if (e.target.id === "switchToSignIn") this.showSignInForm();
      if (e.target.classList?.contains("forgot-password")) {
        e.preventDefault();
        this.showForgotPasswordForm();
      }
    });
  }

  refreshAuthState() {
    try {
      return new Promise((resolve) => {
        fetch(`${window.API_BASE}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
        })
          .then((r) => {
            if (r.status === 401) {
              console.log("Not authenticated or session expired");
              try {
                localStorage.removeItem("user");
              } catch (_) {}
              this.isAuthenticated = false;
              this.currentUser = null;
              this.updateUI();
              return null;
            }
            return r.json();
          })
          .then((data) => {
            if (!data) return resolve();
            if (data && data.success && data.user) {
              this.currentUser = data.user;
              try {
                localStorage.setItem("user", JSON.stringify(data.user));
              } catch (_) {}
              this.isAuthenticated = true;
            } else {
              this.isAuthenticated = false;
            }
            this.updateUI();
            resolve();
          })
          .catch(() => {
            this.updateUI();
            resolve();
          });
      });
    } catch (_) {
      this.updateUI();
      return Promise.resolve();
    }
  }

  _updateAuthButton(btn, isMobile = false) {
    if (!btn) return;

    const t = window.t || ((key) => key.replace(/_/g, " "));
    const isAuthenticated = this.isAuthenticated;

    const states = {
      authenticated: {
        src: "./assets/profile.svg", // Or keep as login.svg if you prefer
        alt: t("profile"),
        text: t("profile"),
        className: "btn btn-primary", // Keep consistent style
        tooltip: t("profile"),
        action: () => this.showProfileModal(),
      },
      unauthenticated: {
        src: "./assets/login.svg",
        alt: t("login"),
        text: t("login"),
        className: "btn btn-primary",
        tooltip: t("login"),
        action: () => this.showSignInForm(),
      },
    };

    const state = isAuthenticated ? states.authenticated : states.unauthenticated;

    if (btn.tagName === "IMG") {
      btn.src = state.src;
      btn.alt = state.alt;
      // For mobile/tablet, the 'title' attribute acts as a simple tooltip
      if (isMobile) {
        btn.title = state.tooltip;
      }
    } else {
      btn.textContent = state.text;
      btn.className = state.className;
    }

    btn.onclick = state.action;

    const tooltipWrapper = btn.closest(".tooltip-wrapper");
    if (tooltipWrapper) {
      tooltipWrapper.setAttribute("data-tooltip", state.tooltip);
    }
  }

  updateUI() {
    this._updateAuthButton(document.getElementById("signInBtn"));
    this._updateAuthButton(document.getElementById("mobileSignInBtn"), true);
    this._updateAuthButton(document.getElementById("tabletSignInBtn"), true);

    // Admin link visibility from DB role
    try {
      const adminLink = document.getElementById("adminLink");
      if (adminLink)
        adminLink.style.display =
          this.currentUser && this.currentUser.role === "admin"
            ? "inline-block"
            : "none";
        if (adminLink && this.currentUser && this.currentUser.role === "admin") {
          document.getElementById("adminLink").innerHTML = t("adminLink");
        }
    } catch (_) {}

    // Usage + daily banner (backend only)
    try {
      const apiUsageEl = document.getElementById("apiUsage");
      const freeBanner = document.getElementById("freeBanner");
      if (!apiUsageEl) {
        if (apiUsageEl) apiUsageEl.style.display = "none";
        if (freeBanner) freeBanner.style.display = "none";
        return;
      }
      fetch(`${window.API_BASE}/api/v1/usage/me`, {
        method: "GET",
        credentials: "include",
      })
        .then((r) => {
          if (r.status === 401) {
            if (apiUsageEl) apiUsageEl.style.display = "none";
            if (freeBanner) freeBanner.style.display = "none";
            return null;
          }
          return r.json().then((data) => ({ ok: r.ok, data }));
        })
        .then((result) => {
          if (!result) return; // Already handled 401 case
          const { ok, data } = result;
          if (!ok || !data || !data.success || !data.usage) {
            if (apiUsageEl) apiUsageEl.style.display = "none";
            if (freeBanner) freeBanner.style.display = "none";
            return;
          }
          const totalCalls = Number(data.usage.total_calls || 0);
          const tokens = Number(data.usage.tokens_total || 0);
          if (apiUsageEl) {
            apiUsageEl.textContent = `Calls: ${totalCalls}  Tokens: ${tokens}`;
            apiUsageEl.style.display = "inline-block";
          }
          const daily = data.usage.daily;
          if (
            daily &&
            typeof daily.limit === "number" &&
            typeof daily.remaining === "number"
          ) {
            const txt =
              window.STRINGS?.en?.free_remaining?.(daily.remaining) ||
              `Remaining free calls: ${daily.remaining}`;
            if (freeBanner) {
              freeBanner.textContent = txt;
              freeBanner.style.display = "inline-block";
              if (daily.remaining <= 0) freeBanner.classList.add("maxed");
              else freeBanner.classList.remove("maxed");
            }
          } else if (freeBanner) {
            freeBanner.style.display = "none";
          }
        })
        .catch(() => {
          // Network error - silently hide usage display
          if (apiUsageEl) apiUsageEl.style.display = "none";
          if (freeBanner) freeBanner.style.display = "none";
        });
    } catch (_) {}
  }

  showSignInForm() {
    this.createModal("signIn");
  }
  showRegisterForm() {
    this.createModal("register");
  }
  showForgotPasswordForm() {
    this.createModal("forgot");
  }
  showProfileModal() {
    this.createModal("profile");
  }

  createModal(type = "signIn") {
    const existing = document.querySelector(".auth-modal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.innerHTML = this.getModalHTML(type);
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);
    
    // Bind events for sub-modals within the profile view
    if (['changePassword', 'modifyUsername', 'savedGames', 'logoutConfirm', 'deleteGameConfirm', 'loadGameConfirm'].includes(type)) {
      this.bindProfileSubModalEvents(type);
    }
    if (type === 'profile') {
      this.bindProfileModalEvents();
    }
  }

  getModalHTML(type) {
    const _ = (k, p) => (window.t ? t(k, p) : k);
    if (type === "signIn")
      return `
      <div class="auth-modal-content">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header mobile-logo-header"><h2>${
              _("signin_title") || "Sign in to continue your crossword journey"
            }</h2></div>
            <form id="signInFormElement" class="auth-form">
              <div class="form-group"><label for="signInUsername">${
                _("username_or_email") || "Username or Email"
              }</label><input type="text" id="signInUsername" name="username" required></div>
              <div class="form-group"><label for="signInPassword">${
                _("password") || "Password"
              }</label><input type="password" id="signInPassword" name="password" required></div>
              <div class="form-actions"><button type="submit" class="btn btn-primary">${
                _("login") || "Log In"
              }</button><button type="button" class="btn btn-secondary" id="switchToRegister">${
        _("create_account") || "Create Account"
      }</button></div>
              <div class="auth-links"><a href="#" class="forgot-password">${
                _("forgot_password_link") || "Forgot Password?"
              }</a></div>
            </form>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${
            _("brand_name") || "CrossyThink"
          }</h3><p>${
        _("brand_tagline") || "Challenge your mind with AI-powered crosswords"
      }</p></div></div>
        </div>
      </div>`;
    if (type === "register")
      return `
      <div class="auth-modal-content">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${
              _("register_title") ||
              "Create your account and start solving puzzles"
            }</h2></div>
            <form id="registerFormElement" class="auth-form">
              <div class="form-group"><label for="registerUsername">${
                _("username") || "Username"
              }</label><input type="text" id="registerUsername" name="username" required minlength="6" maxlength="12"></div>
              <div class="form-group"><label for="registerEmail">${
                _("email") || "Email"
              }</label><input type="email" id="registerEmail" name="email" required></div>
              <div class="form-group"><label for="registerPassword">${
                _("password") || "Password"
              }</label><input type="password" id="registerPassword" name="password" required minlength="6" maxlength="15"></div>
              <div class="form-group"><label for="confirmPassword">${
                _("confirm_password") || "Confirm Password"
              }</label><input type="password" id="confirmPassword" name="confirmPassword" required minlength="6" maxlength="15"></div>
              <div class="form-actions"><button type="submit" class="btn btn-primary">${
                _("create_account") || "Create Account"
              }</button><button type="button" class="btn btn-secondary" id="switchToSignIn">${
        _("back_to_signin") || "Back to Sign In"
      }</button></div>
            </form>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h4>${
            _("brand_name") || "CrossyThink"
          }</h4><p>${
        _("brand_tagline") || "Challenge your mind with AI-powered crosswords"
      }</p></div></div>
        </div>
      </div>`;
    if (type === "forgot")
      return `
      <div class="auth-modal-content">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${
              _("forgot_title") || "Reset your password"
            }</h2><p>${
        _("forgot_instructions") ||
        "Enter your email or username and we'll send a reset link."
      }</p></div>
            <form id="forgotPasswordFormElement" class="auth-form">
              <div class="form-group"><label for="forgotIdentifier">${
                _("email_or_username") || "Email or Username"
              }</label><input type="text" id="forgotIdentifier" name="identifier" required></div>
              <div class="form-actions"><button type="submit" class="btn btn-primary">${
                _("send_reset_link") || "Send Reset Link"
              }</button><button type="button" class="btn btn-secondary" id="switchToSignIn">${
        _("back_to_signin") || "Back to Sign In"
      }</button></div>
            </form>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${
            _("brand_name") || "CrossyThink"
          }</h3><p>${
        _("reset_right_panel") || "We'll help you get back in."
      }</p></div></div>
        </div>
      </div>`;
    if (type === "profile")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("profile_title") || "User Profile"}</h2></div>
            <div class="profile-details">
              <p><strong>${_("username")}:</strong> <span id="profileUsername">${this.currentUser?.username || '...'}</span></p>
              <p><strong>${_("email")}:</strong> <span id="profileEmail">${this.currentUser?.email || '...'}</span></p>
            </div>
            <div class="profile-actions">
              <button type="button" class="btn btn-secondary" id="profileModifyUsernameBtn">${_("modify_username") || "Modify Username"}</button>
              <button type="button" class="btn btn-secondary" id="profileSavedGamesBtn">${_("saved_games") || "Saved Games"}</button>
              <button type="button" class="btn btn-secondary" id="profileChangePasswordBtn">${_("change_password") || "Change Password"}</button>
              <button type="button" class="btn btn-danger" id="profileLogoutBtn">${_("logout") || "Log Out"}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${
            _("brand_name") || "CrossyThink"
          }</h3><p>${
        _("profile_tagline") || "Manage your account and game progress."
      }</p></div></div>
        </div>
      </div>`;
    if (type === "modifyUsername")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("modify_username")}</h2></div>
            <form id="modifyUsernameFormElement" class="auth-form">
              <div class="form-group">
                <label for="newUsername">${_("new_username")}</label>
                <input type="text" id="newUsername" name="newUsername" required minlength="6" maxlength="12" value="${this.currentUser?.username || ''}">
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">${_("save_changes")}</button>
                <button type="button" class="btn btn-secondary" id="backToProfile">${_("back_to_profile")}</button>
              </div>
            </form>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;
    if (type === "changePassword")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("change_password")}</h2></div>
            <form id="changePasswordFormElement" class="auth-form">
              <div class="form-group">
                <label for="currentPassword">${_("current_password")}</label>
                <input type="password" id="currentPassword" name="currentPassword" required>
              </div>
              <div class="form-group">
                <label for="newPassword">${_("new_password")}</label>
                <input type="password" id="newPassword" name="newPassword" required minlength="6" maxlength="15">
              </div>
              <div class="form-group">
                <label for="confirmNewPassword">${_("confirm_new_password")}</label>
                <input type="password" id="confirmNewPassword" name="confirmNewPassword" required minlength="6" maxlength="15">
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">${_("update_password")}</button>
                <button type="button" class="btn btn-secondary" id="backToProfile">${_("back_to_profile")}</button>
              </div>
            </form>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;
    if (type === "savedGames")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("saved_games")}</h2></div>
            <div class="saved-games-container">
              <div class="saved-game-card-wrapper" data-slot="1">
                <div class="saved-game-card"><div class="card-content">${_("empty_slot")}</div></div>
              </div>
              <div class="saved-game-card-wrapper" data-slot="2">
                <div class="saved-game-card"><div class="card-content">${_("empty_slot")}</div></div>
              </div>
              <div class="saved-game-card-wrapper" data-slot="3">
                <div class="saved-game-card"><div class="card-content">${_("empty_slot")}</div></div>
              </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="backToProfile">${_("back_to_profile")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;
    if (type === "logoutConfirm")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("confirm_logout_title")}</h2></div>
            <p class="text-center">${_("confirm_logout_text")}</p>
            <div class="form-actions">
                <button type="button" class="btn btn-danger" id="confirmLogoutYes">${_("yes")}</button>
                <button type="button" class="btn btn-secondary" id="backToProfile">${_("no")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${
            _("brand_name") || "CrossyThink"
          }</h3><p>${
        _("profile_tagline") || "Manage your account and game progress."
      }</p></div></div>
        </div>
      </div>`;
    if (type === "deleteGameConfirm")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("confirm_delete_title")}</h2></div>
            <p class="text-center">${_("confirm_delete_text")}</p>
            <div class="form-actions">
                <button type="button" class="btn btn-danger" id="confirmDeleteYes">${_("yes_delete")}</button>
                <button type="button" class="btn btn-secondary" id="backToSavedGames">${_("no_cancel")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;
    if (type === "loadGameConfirm")
      return `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("confirm_load_title")}</h2></div>
            <p class="text-center">${_("confirm_load_game")}</p>
            <div class="form-actions">
                <button type="button" class="btn btn-primary" id="confirmLoadYes">${_("yes_load")}</button>
                <button type="button" class="btn btn-secondary" id="backToSavedGames">${_("no_cancel")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${
            _("brand_name") || "CrossyThink"
          }</h3><p>${
        _("profile_tagline") || "Manage your account and game progress."
      }</p></div></div>
        </div>
      </div>`;
    return "";
  }

  closeModal() {
    const m = document.querySelector(".auth-modal");
    if (!m) return;
    m.classList.remove("show");
    setTimeout(() => {
      m.remove();
      // If user is not authenticated after closing modal, clear the game
      if (!this.isAuthenticated && window.__game) {
        try {
          window.__game.clearGame();
        } catch (_) {}
      }
    }, 250);
  }

  showMessage(msg, type = "info") {
    const content = document.querySelector(".auth-modal-content");
    if (!content) return;
    const existing = content.querySelector(".auth-message");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.className = `auth-message auth-message-${type}`;
    div.textContent = msg;
    content.insertBefore(div, content.firstChild);
    setTimeout(() => {
      if (div.parentNode) div.remove();
    }, 3000);
  }

  async handleSignIn(e) {
    const form = e?.target || document.getElementById("signInFormElement");
    const fd = new FormData(form);
    const username = (fd.get("username") || "").toString().trim();
    const password = (fd.get("password") || "").toString();
    if (!username || !password) {
      this.showMessage(
        window.t ? t("fill_all_fields") : "Please fill in all fields",
        "error"
      );
      return;
    }
    this.showMessage(window.t ? t("signing_in") : "Signing in...", "info");
    try {
      const r = await fetch(`${window.API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(
          data.error || (window.t ? t("login_failed") : "Login failed")
        );
      if (data.user)
        try {
          localStorage.setItem("user", JSON.stringify(data.user));
        } catch (_) {}
      this.currentUser = data.user || null;
      this.isAuthenticated = true;
      this.closeModal();
      this.updateUI();
    } catch (err) {
      this.showMessage(
        err.message || (window.t ? t("login_failed") : "Login failed"),
        "error"
      );
    }
  }

  async handleRegister(e) {
    const form = e?.target || document.getElementById("registerFormElement");
    const fd = new FormData(form);
    const username = (fd.get("username") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const password = (fd.get("password") || "").toString();
    const confirmPassword = (fd.get("confirmPassword") || "").toString();
    if (!username || !email || !password || !confirmPassword) {
      this.showMessage(
        window.t ? t("all_fields_required") : "All fields are required",
        "error"
      );
      return;
    }
    if (password !== confirmPassword) {
      this.showMessage(
        window.t ? t("passwords_no_match") : "Passwords do not match",
        "error"
      );
      return;
    }
    this.showMessage(
      window.t ? t("creating_account") : "Creating account...",
      "info"
    );
    try {
      const r = await fetch(`${window.API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(
          data.error ||
            (window.t ? t("registration_failed") : "Registration failed")
        );
      if (data.user)
        try {
          localStorage.setItem("user", JSON.stringify(data.user));
        } catch (_) {}
      this.currentUser = data.user || null;
      this.isAuthenticated = true;
      this.closeModal();
      this.updateUI();
    } catch (err) {
      this.showMessage(
        err.message ||
          (window.t ? t("registration_failed") : "Registration failed"),
        "error"
      );
    }
  }

  async handleForgotPassword(e) {
    const form =
      e?.target || document.getElementById("forgotPasswordFormElement");
    const fd = new FormData(form);
    const identifier = (fd.get("identifier") || "").toString().trim();
    if (!identifier) {
      this.showMessage(
        window.t
          ? t("enter_email_or_username")
          : "Please enter your email or username",
        "error"
      );
      return;
    }
    this.showMessage(
      window.t ? t("sending_reset_link") : "Sending reset link...",
      "info"
    );
    try {
      const payload = /@/.test(identifier)
        ? { email: identifier }
        : { username: identifier };
      const r = await fetch(`${window.API_BASE}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(
          data.error || (window.t ? t("reset_failed") : "Reset failed")
        );
      this.showMessage(
        window.t
          ? t("reset_link_generic_ok")
          : "If that account exists, a reset link has been sent.",
        "success"
      );
    } catch (_) {
      this.showMessage(
        window.t
          ? t("reset_link_generic_ok")
          : "If that account exists, a reset link has been sent.",
        "success"
      );
    }
  }

  bindProfileSubModalEvents(type) {
    document.getElementById('backToProfile')?.addEventListener('click', () => this.showProfileModal());
    document.getElementById('backToSavedGames')?.addEventListener('click', () => this.createModal('savedGames'));
    // Retrieve gameId from a temporary storage if needed for confirmation modals
    const gameIdForConfirm = sessionStorage.getItem('gameIdForConfirm');

    if (type === 'modifyUsername') {
      document.getElementById('modifyUsernameFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const newUsername = (new FormData(form).get('newUsername') || '').toString().trim();
        if (!newUsername) {
          this.showMessage(t('fill_all_fields'), 'error');
          return;
        }

        this.showMessage(t('saving_changes'), 'info');
        fetch(`${window.API_BASE}/api/v1/auth/change-username`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newUsername }),
        })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || 'Failed to change username.');
          this.showMessage(t('username_change_success'), 'success');
          // Wait for the success message to show, then refresh state and show the modal
          setTimeout(() => {
            this.refreshAuthState().then(() => this.showProfileModal());
          }, 1500);
        })
        .catch(err => this.showMessage(err.message, 'error'));
      });
    }

    if (type === 'changePassword') {
      document.getElementById('changePasswordFormElement')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const currentPassword = fd.get('currentPassword');
        const newPassword = fd.get('newPassword');
        const confirmNewPassword = fd.get('confirmNewPassword');

        if (!currentPassword || !newPassword || !confirmNewPassword) {
          this.showMessage(t('fill_all_fields'), 'error');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          this.showMessage(t('passwords_no_match'), 'error');
          return;
        }

        this.showMessage(t('updating_password_msg'), 'info');
        fetch(`${window.API_BASE}/api/v1/auth/change-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || 'Failed to update password.');
          this.showMessage(t('password_change_success'), 'success');
          setTimeout(() => this.showProfileModal(), 1500);
        })
        .catch(err => this.showMessage(err.message, 'error'));
      });
    }

    if (type === 'savedGames') {
      const cardWrappers = document.querySelectorAll('.saved-game-card-wrapper');
      cardWrappers.forEach(wrapper => wrapper.querySelector('.saved-game-card').innerHTML = `<div class="card-content">${t('loading')}...</div>`);

      fetch(`${window.API_BASE}/api/v1/saved-games`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(result => {
        if (!result.success) throw new Error(result.error || 'Failed to load saved games.');
        const games = result.saved_games;
        cardWrappers.forEach((wrapper, index) => {
          const game = games[index];
          const card = wrapper.querySelector('.saved-game-card');
          if (game) {
            card.dataset.gameId = game.id;
            card.innerHTML = `<div class="card-content"><strong>${game.topic}</strong><br>${game.difficulty}<br><small>${new Date(game.started_at).toLocaleDateString()}</small></div>`;
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-delete-game';
            deleteBtn.textContent = t('delete');
            deleteBtn.dataset.gameId = game.id;
            wrapper.appendChild(deleteBtn);
          } else {
            card.innerHTML = `<div class="card-content">${t('no_saved_game')}</div>`;
          }
        });

        // Add event listeners after elements are created
        document.querySelectorAll('.saved-game-card').forEach(card => {
          card.addEventListener('click', () => {
            const gameId = card.dataset.gameId;
            if (gameId) {
              sessionStorage.setItem('gameIdForConfirm', gameId);
              this.createModal('loadGameConfirm');
            }
          });
        });
        document.querySelectorAll('.btn-delete-game').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            const gameId = btn.dataset.gameId;
            if (gameId) {
              sessionStorage.setItem('gameIdForConfirm', gameId);
              this.createModal('deleteGameConfirm');
            }
          });
        });
      })
      .catch(err => {
        console.error(err);
        cardWrappers.forEach(wrapper => wrapper.querySelector('.saved-game-card').innerHTML = `<div class="card-content">${t('error_loading_games')}</div>`);
      });
    }

    if (type === 'deleteGameConfirm' && gameIdForConfirm) {
      document.getElementById('confirmDeleteYes')?.addEventListener('click', () => {
        this.showMessage(t('deleting_game'), 'info');
        fetch(`${window.API_BASE}/api/v1/saved-games/${gameIdForConfirm}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) throw new Error(data.error || 'Failed to delete game.');
          this.showMessage(t('game_deleted_success'), 'success');
          setTimeout(() => this.createModal('savedGames'), 1000);
        })
        .catch(err => this.showMessage(err.message, 'error'));
      });
    }
    if (type === 'loadGameConfirm' && gameIdForConfirm) {
      document.getElementById('confirmLoadYes')?.addEventListener('click', () => {
        if (window.__game) {
          this.closeModal();
          window.__game.gameApi.loadSavedGame(gameIdForConfirm);
        }
      });
    }

    if (type === 'logoutConfirm') {
      document.getElementById('confirmLogoutYes')?.addEventListener('click', () => {
        this.signOut();
      });
    } 
  }

  bindProfileModalEvents() {
    const logoutBtn = document.getElementById('profileLogoutBtn');
    const modifyUsernameBtn = document.getElementById('profileModifyUsernameBtn');
    const savedGamesBtn = document.getElementById('profileSavedGamesBtn');
    const changePasswordBtn = document.getElementById('profileChangePasswordBtn');

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.createModal('logoutConfirm');
      });
    }

    modifyUsernameBtn?.addEventListener('click', () => this.createModal('modifyUsername'));
    savedGamesBtn?.addEventListener('click', () => this.createModal('savedGames'));
    changePasswordBtn?.addEventListener('click', () => this.createModal('changePassword'));
  }

  signOut() {
    // Ask backend to clear httpOnly JWT cookie, then reset local state
    fetch(`${window.API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    })
      .catch(() => {})
      .finally(() => {
        try {
          localStorage.removeItem("user");
        } catch (_) {}
        this.currentUser = null;
        this.isAuthenticated = false;
        if (window.__game) {
          try {
            window.__game.clearGame();
          } catch (_) {}
        }
        this.updateUI();
        // Close any open auth/profile modal so the user sees the logged-out state
        try {
          this.closeModal();
        } catch (_) {}
      });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    window.__auth = new AuthManager();
  } catch (_) {}
});

// Expose a lightweight global refresher so other pages (e.g., gameplay)
// can update Calls/Tokens/Remaining without a full page reload.
// gameplay.js already calls window.refreshUsageIndicator() after a game.
document.addEventListener("DOMContentLoaded", () => {
  try {
    window.refreshUsageIndicator = () => {
      try {
        window.__auth?.refreshAuthState();
      } catch (_) {}
    };
  } catch (_) {}
});
