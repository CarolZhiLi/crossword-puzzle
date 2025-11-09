// Topic and Difficulty management
import { t } from "../strings.js";

export class TopicDifficulty {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  setupEventListeners() {
    // Dropdown change handlers
    const topicSelect = document.getElementById("topicSelect");
    const difficultySelect = document.getElementById("difficultySelect");

    if (topicSelect) {
      topicSelect.addEventListener("change", (e) => {
        this.handleTopicChange(e.target.value);
      });
    }

    if (difficultySelect) {
      difficultySelect.addEventListener("change", (e) => {
        this.handleDifficultyChange(e.target.value);
      });
    }
  }

  handleTopicChange(topic) {
    console.log("Topic changed to:", topic);
    // Here you would typically generate a new puzzle based on the topic
    // For now, we'll just show a message
    const msg = t("topic_changed", { topic });
    alert(msg);
  }

  handleDifficultyChange(difficulty) {
    console.log("Difficulty changed to:", difficulty);

    // Adjust grid size based on difficulty
    let newGridSize;
    switch (difficulty) {
      case "Easy":
        newGridSize = 10;
        break;
      case "Medium":
        newGridSize = 12;
        break;
      case "Hard":
        newGridSize = 15;
        break;
      default:
        newGridSize = 15;
    }

    if (newGridSize !== this.game.gridSize) {
      this.game.gridSize = newGridSize;
      this.game.initializeGrid();
      const msg = t("grid_size_changed", { size: newGridSize, difficulty });
      alert(msg);
    }
  }

  syncModalDropdowns() {
    // Sync dropdowns with current values
    const topicSelect = document.getElementById("topicSelect");
    const difficultySelect = document.getElementById("difficultySelect");
    const modalTopicSelect = document.getElementById("modalTopicSelect");
    const modalDifficultySelect = document.getElementById("modalDifficultySelect");

    if (topicSelect && modalTopicSelect) {
      modalTopicSelect.value = topicSelect.value;
    }
    if (difficultySelect && modalDifficultySelect) {
      modalDifficultySelect.value = difficultySelect.value;
    }
  }

  setupModalHandlers() {
    const modalTopicSelect = document.getElementById("modalTopicSelect");
    const modalDifficultySelect = document.getElementById("modalDifficultySelect");
    const customThemeRow = document.getElementById("customThemeRow");
    const customThemeInput = document.getElementById("customThemeInput");
    const topicSelect = document.getElementById("topicSelect");
    const difficultySelect = document.getElementById("difficultySelect");

    // Toggle custom theme input visibility
    const syncCustomVisibility = () => {
      if (!customThemeRow) return;
      const show = modalTopicSelect && modalTopicSelect.value === "General";
      customThemeRow.style.display = show ? "block" : "none";
      if (show && this.game.customTopic) {
        customThemeInput.value = this.game.customTopic;
      }
    };

    if (modalTopicSelect) {
      modalTopicSelect.addEventListener("change", syncCustomVisibility);
      syncCustomVisibility();
    }

    // Handle modal start game button click
    const modalStartGameBtn = document.getElementById("modalStartGameBtn");
    if (modalStartGameBtn) {
      modalStartGameBtn.addEventListener("click", () => {
        console.log("Modal start game button clicked");
        // Sync values to main dropdowns
        if (topicSelect && modalTopicSelect) {
          topicSelect.value = modalTopicSelect.value;
          console.log("Topic synced:", modalTopicSelect.value);
        }
        if (difficultySelect && modalDifficultySelect) {
          difficultySelect.value = modalDifficultySelect.value;
          console.log("Difficulty synced:", modalDifficultySelect.value);
        }
        // Capture custom theme if needed
        if (modalTopicSelect && modalTopicSelect.value === "General") {
          const entered = (customThemeInput?.value || "").trim();
          if (!entered) {
            alert("Please enter a theme.");
            return;
          }
          this.game.customTopic = entered;
          console.log("Custom topic set:", this.game.customTopic);
        }

        this.closeGameModal();
        console.log("Starting game via gameApi.startGame()");
        this.game.gameApi.startGame();
      });
    }
  }

  applyI18n() {
    try {
      const topic = document.getElementById("topicSelect");
      if (topic && topic.options && topic.options.length >= 5) {
        topic.options[0].text = t("topic_js");
        topic.options[1].text = t("topic_science");
        topic.options[2].text = t("topic_history");
        topic.options[3].text = t("topic_animals");
        topic.options[4].text = t("topic_custom");
      }

      const diff = document.getElementById("difficultySelect");
      if (diff && diff.options && diff.options.length >= 4) {
        diff.options[0].text = t("diff_easy");
        diff.options[1].text = t("diff_medium");
        diff.options[2].text = t("diff_hard");
      }
    } catch (_) {
      // Silently fail if translation function is not available
    }
  }

  getCurrentTopic() {
    const topicSelect = document.getElementById("topicSelect");
    return topicSelect ? topicSelect.value : "JavaScript";
  }

  getCurrentDifficulty() {
    const difficultySelect = document.getElementById("difficultySelect");
    return difficultySelect ? difficultySelect.value : "Easy";
  }

  showGameControlsModal() {
    console.log("Showing game controls modal");
    // Remove existing modal if any
    const existingModal = document.querySelector(".game-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "game-modal";
    modal.innerHTML = `
            <div class="game-modal-content">
                <button class="game-modal-close">&times;</button>
                <div class="game-modal-header">
                    <h2>${"New Game"}</h2>
                </div>
                <div class="game-settings">
                    <select id="modalTopicSelect" class="dropdown">
                        <option value="JavaScript">${
                          t("topic_js") || "JavaScript"
                        }</option>
                        <option value="Science">${
                          t("topic_science") || "Science"
                        }</option>
                        <option value="History">${
                          t("topic_history") || "History"
                        }</option>
                        <option value="Animals">${
                          t("topic_animals") || "Animals"
                        }</option>
                        <option value="General">${
                          t("topic_custom") || "Customize"
                        }</option>
                    </select>
                    <div id="customThemeRow" style="display:none">
                        <input id="customThemeInput" type="text" class="dropdown"
                               placeholder="Enter a theme (e.g., Space, Cooking, NBA)" />
                    </div>
                    <select id="modalDifficultySelect" class="dropdown">
                        <option value="Easy">${
                          t("diff_easy") || "Easy"
                        }</option>
                        <option value="Medium">${
                          t("diff_medium") || "Medium"
                        }</option>
                        <option value="Hard">${
                          t("diff_hard") || "Hard"
                        }</option>
                    </select>
                    <button class="btn btn-primary" id="modalStartGameBtn">
                        Start Game
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector(".game-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.closeGameModal();
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("game-modal")) {
        this.closeGameModal();
      }
    });

    // Sync dropdowns and setup modal handlers
    this.syncModalDropdowns();
    this.setupModalHandlers();

    // Use a tiny delay to allow the browser to render the element before starting the transition.
    setTimeout(() => {
      modal.classList.add("show");
      console.log("Modal 'show' class added");
    }, 10); // A small 10ms delay is standard practice for CSS transitions on new elements.
  }

  closeGameModal() {
    const modal = document.querySelector(".game-modal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }
}

