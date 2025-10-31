;(function(){
  window.I18N = window.I18N || {};
  window.I18N.en = {
    guest_free_over: "Your free trial has ended. Please sign up or log in to play 3 free games per day.",
    user_daily_limit: "You've used your 3 free plays for today. Paid play is coming soon.",
    select_word_first: "Please select a word first!",
    correct: "Correct!",
    incorrect: "Incorrect. Try again!",
    puzzle_progress: "Puzzle Progress: {correct}/{total} words correct ({percent}%)",
    puzzle_solved: "Congratulations! You solved the puzzle!",
    topic_changed: "Topic changed to: {topic}. New puzzle will be generated based on this topic.",
    grid_size_changed: "Grid size changed to {size}x{size} for {difficulty} difficulty.",
    confirm_new_game: "Are you sure you want to start a new game? Your progress will be lost.",
    confirm_restart: "Are you sure you want to restart this puzzle?",
    error_generating_puzzle: "Error generating puzzle"
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

