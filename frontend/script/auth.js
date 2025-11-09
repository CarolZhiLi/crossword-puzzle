// API_BASE is set by config.js. Do not hardcode here.
(function () {
  if (typeof window !== "undefined" && !window.API_BASE) {
    window.API_BASE = "http://localhost:5050";
  }
})();

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = !!(
      typeof localStorage !== "undefined" && localStorage.getItem("token")
    );
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
      const token = localStorage.getItem("token");
      if (token) {
        // Fetch current user from backend (DB-sourced role)
        fetch(`${window.API_BASE}/api/auth/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => {
            if (r.status === 401) {
              // Token is invalid or expired, clear it
              console.log("Token invalid or expired, clearing authentication");
              try {
                localStorage.removeItem("token");
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
            if (!data) return; // Already handled 401 case
            if (data && data.success && data.user) {
              this.currentUser = data.user;
              try {
                localStorage.setItem("user", JSON.stringify(data.user));
              } catch (_) {}
              this.isAuthenticated = true;
            } else {
              this.isAuthenticated = true; // token existed; keep until invalidated elsewhere
            }
            this.updateUI();
          })
          .catch(() => {
            // Network error or other issue - don't clear token on network errors
            this.updateUI();
          });
      } else {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.updateUI();
      }
    } catch (_) {
      this.updateUI();
    }
  }

  updateUI() {
    const signInBtn = document.getElementById("signInBtn");
    const mobileSignInBtn = document.getElementById("mobileSignInBtn");
    const tabletSignInBtn = document.getElementById("tabletSignInBtn");
    const apiUsageEl = document.getElementById("apiUsage");
    const freeBanner = document.getElementById("freeBanner");
    const adminLink = document.getElementById("adminLink");

    // Update desktop sign in button (img element)
    if (signInBtn) {
      if (this.isAuthenticated) {
        // Change to logout icon
        if (signInBtn.tagName === "IMG") {
          signInBtn.src = "./assets/logout.svg";
          signInBtn.alt = window.t ? t("logout") : "Log Out";
        } else {
          signInBtn.textContent = window.t ? t("logout") : "Log Out";
          signInBtn.className = "btn btn-success";
        }
        signInBtn.onclick = () => this.signOut();
        // Update tooltip wrapper if it exists
        const tooltipWrapper = signInBtn.closest(".tooltip-wrapper");
        if (tooltipWrapper) {
          tooltipWrapper.setAttribute(
            "data-tooltip",
            window.t ? t("logout") : "Log Out"
          );
        }
      } else {
        // Change to login icon
        if (signInBtn.tagName === "IMG") {
          signInBtn.src = "./assets/login.svg";
          signInBtn.alt = window.t ? t("login") : "Log In";
        } else {
          signInBtn.textContent = window.t ? t("login") : "Log In";
          signInBtn.className = "btn btn-primary";
        }
        signInBtn.onclick = () => this.showSignInForm();
        // Update tooltip wrapper if it exists
        const tooltipWrapper = signInBtn.closest(".tooltip-wrapper");
        if (tooltipWrapper) {
          tooltipWrapper.setAttribute(
            "data-tooltip",
            window.t ? t("login") : "Log In"
          );
        }
      }
    }

    // Reflect auth state on mobile login icon via title and click behavior
    if (mobileSignInBtn) {
      if (this.isAuthenticated) {
        if (mobileSignInBtn.tagName === "IMG") {
          mobileSignInBtn.src = "./assets/logout.svg";
          mobileSignInBtn.alt = window.t ? t("logout") : "Log Out";
        }
        mobileSignInBtn.title = window.t ? t("logout") : "Log Out";
      } else {
        if (mobileSignInBtn.tagName === "IMG") {
          mobileSignInBtn.src = "./assets/login.svg";
          mobileSignInBtn.alt = window.t ? t("login") : "Log In";
        }
        mobileSignInBtn.title = window.t ? t("login") : "Log In";
      }
      mobileSignInBtn.onclick = () => {
        if (this.isAuthenticated) this.signOut();
        else this.showSignInForm();
      };
    }

    // Update tablet sign in button
    if (tabletSignInBtn) {
      if (this.isAuthenticated) {
        if (tabletSignInBtn.tagName === "IMG") {
          tabletSignInBtn.src = "./assets/logout.svg";
          tabletSignInBtn.alt = window.t ? t("logout") : "Log Out";
        }
        tabletSignInBtn.title = window.t ? t("logout") : "Log Out";
      } else {
        if (tabletSignInBtn.tagName === "IMG") {
          tabletSignInBtn.src = "./assets/login.svg";
          tabletSignInBtn.alt = window.t ? t("login") : "Log In";
        }
        tabletSignInBtn.title = window.t ? t("login") : "Log In";
      }
      tabletSignInBtn.onclick = () => {
        if (this.isAuthenticated) this.signOut();
        else this.showSignInForm();
      };
    }

    // Admin link visibility from DB role
    try {
      if (adminLink)
        adminLink.style.display =
          this.currentUser && this.currentUser.role === "admin"
            ? "inline-block"
            : "none";
    } catch (_) {}

    // Usage + daily banner (backend only)
    try {
      const token = localStorage.getItem("token");
      if (!token || !apiUsageEl) {
        if (apiUsageEl) apiUsageEl.style.display = "none";
        if (freeBanner) freeBanner.style.display = "none";
        return;
      }
      fetch(`${window.API_BASE}/api/usage/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (r.status === 401) {
            // Token is invalid, but don't clear it here (already handled in refreshAuthState)
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

  createModal(type = "signIn") {
    const existing = document.querySelector(".auth-modal");
    if (existing) existing.remove();
    const modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.innerHTML = this.getModalHTML(type);
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);
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
      const r = await fetch(`${window.API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(
          data.error || (window.t ? t("login_failed") : "Login failed")
        );
      if (data.access_token) localStorage.setItem("token", data.access_token);
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
      const r = await fetch(`${window.API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await r.json();
      if (!r.ok || !data.success)
        throw new Error(
          data.error ||
            (window.t ? t("registration_failed") : "Registration failed")
        );
      if (data.access_token) localStorage.setItem("token", data.access_token);
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
      const r = await fetch(`${window.API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  signOut() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (_) {}
    this.currentUser = null;
    this.isAuthenticated = false;
    // Clear the game when user logs out
    if (window.__game) {
      try {
        window.__game.clearGame();
      } catch (_) {}
    }
    this.updateUI();
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
