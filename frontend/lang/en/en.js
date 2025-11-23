;(function(){
  window.I18N = window.I18N || {};
  window.I18N.en = {
    // General/gameplay
    guest_free_over:
      "Your free trial has ended. Please sign up or log in to play 3 free games per day.",
    user_daily_limit:
      "You've used your 3 free plays for today. Paid play is coming soon.",
    select_word_first: "Please select a word first!",
    correct: "Correct!",
    incorrect: "Incorrect. Try again!",
    puzzle_progress:
      "Puzzle Progress: {correct}/{total} words correct ({percent}%)",
    puzzle_solved: "Congratulations! You solved the puzzle!",
    topic_changed:
      "Topic changed to: {topic}. New puzzle will be generated based on this topic.",
    grid_size_changed:
      "Grid size changed to {size}x{size} for {difficulty} difficulty.",
    confirm_new_game:
      "Are you sure you want to start a new game? Your progress will be lost.",
    confirm_restart: "Are you sure you want to restart this puzzle?",
    error_generating_puzzle: "Error generating puzzle",

    // Gameplay UI labels
    btn_start_game: "Start Game",
    btn_hint: "Hint",
    btn_check_puzzle: "Check Puzzle",
    btn_new_game: "New Game",
    clues_across: "Across",
    clues_down: "Down",
    topic_js: "JavaScript",
    topic_science: "Science",
    topic_history: "History",
    topic_animals: "Animals",
    topic_custom: "Customize",
    diff_easy: "Easy",
    diff_medium: "Medium",
    diff_hard: "Hard",
    diff_expert: "Expert",
    clue_panel_title: "Clue Panel",

    // Auth UI
    brand_name: "CrossyThink",
    brand_tagline: "Challenge your mind with AI-powered crosswords",
    login: "Log In",
    logout: "Log Out",
    create_account: "Create Account",
    signin_title: "Sign in to continue your crossword journey",
    register_title: "Create your account and start solving puzzles",
    forgot_title: "Reset your password",
    forgot_instructions:
      "Enter your email or username and we'll send a reset link.",
    username_or_email: "Username or Email",
    username: "Username",
    email: "Email",
    password: "Password",
    confirm_password: "Confirm Password",
    forgot_password_link: "Forgot Password?",
    already_have_account: "Already have an account?",
    send_reset_link: "Send Reset Link",
    back_to_signin: "Back to Sign In",

    // Auth messages
    fill_all_fields: "Please fill in all fields",
    signing_in: "Signing in...",
    login_failed: "Login failed",
    welcome_back: "Welcome back, {username}!",
    all_fields_required: "All fields are required",
    username_requirements:
      "Username must be 6-12 chars, letters and numbers, and include both.",
    invalid_email: "Please enter a valid email address",
    password_requirements: "Password must be 6-15 characters",
    passwords_no_match: "Passwords do not match",
    creating_account: "Creating account...",
    registration_failed: "Registration failed",
    account_created_welcome:
      "Account created successfully! Welcome, {username}!",
    enter_email_or_username: "Please enter your email or username",
    sending_reset_link: "Sending reset link...",
    reset_failed: "Failed to request password reset",
    reset_link_generic_ok:
      "If that account exists, a reset link has been sent.",
    signed_out: "You have been signed out",

    // Reset page
    reset_header: "Reset your password",
    reset_subtitle: "Pick a new password to access your account.",
    reset_right_panel: "We'll help you get back in.",
    reset_new_password_label: "New Password (6-15 chars)",
    reset_confirm_password_label: "Confirm Password",
    reset_button: "Reset Password",
    back_to_game: "Back to Game",
    reset_invalid_token: "Invalid or missing reset token.",
    reset_fill_fields: "Please fill in all fields.",
    reset_password_length: "Password must be 6-15 characters.",
    reset_passwords_no_match: "Passwords do not match.",
    reset_success: "Password reset successful. You can now sign in.",
    reset_invalid_or_expired: "Invalid or expired token.",
    crossythink_branding: "CrossyThink",

    // Landing page
    video_not_supported: "Your browser does not support the video tag.",
    adminLink: "Admin",

    // Admin page
    adminHeader: "Admin - Usage Monitor",
    range_all_time: "All Time",
    range_today: "Today",
    refreshBtn: "Refresh",
    exportBtn: "Export CSV",
    resetCallsBtn: "Reset Calls",
    resetTodayBtn: "Reset Today",
    backBtn: "Back",
    api_calls_subtitle: "Shows per-user API calls and token totals (approx.).",
    number_col: "#",
    username_col: "Username",
    email_col: "Email",
    calls_col: "Calls",
    tokens_col: "Tokens",
    games_col: "Games",
    api_usage_subtitle: "Shows API Usage Totals",
    method_col: "Method",
    endpoint_col: "Endpoint",
    request_col: "Requests",
    apiStatsPrevBtn: "Previous",
    apiStatsNextBtn: "Next",
  };

  window.t = function(key, params){
    try {
      const dict = (window.I18N && window.I18N.en) || {};
      let str = dict[key] || key;
      if (params && typeof params === 'object') {
        for (const k in params) {
          if (Object.prototype.hasOwnProperty.call(params, k)) {
            const re = new RegExp('\\{' + k + '\\}', 'g');
            str = str.replace(re, String(params[k]));
          }
        }
      }
      return str;
    } catch (_) {
      return key;
    }
  };
})();
