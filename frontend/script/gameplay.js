// API_BASE is set by config.js - use window.API_BASE
import { GridUtils } from "./game/gridUtils.js";
import { GridSizing } from "./game/gridSizing.js";
import { InputHandler } from "./game/inputHandler.js";
import { GameApi } from "./game/gameApi.js";
import { Definitions } from "./game/definitions.js";

export default class CrosswordGame {
  constructor() {
    this.currentWord = null;
    this.currentDirection = "across";
    this.startTime = Date.now();
    this.timerInterval = null;
    this.gridSize = 15;
    this.solutionGrid = [];
    this.grid = [];
    this.words = {};
    this.customTopic = "";

    // Initialize helper modules
    this.gridSizing = new GridSizing(this);
    this.inputHandler = new InputHandler(this);
    this.gameApi = new GameApi(this);
    this.definitions = new Definitions(this);

    this.verifyElements();
    this.initializeGrid();
    this.setupEventListeners();
    // Don't start timer here - wait until grid is visible
    // Timer will be started in gameApi.startGame() after grid is rendered
    this.updateTimer(); // Just show 00:00 initially
    this.gridSizing.setupResponsiveGrid();
    this.applyI18nUI();
    this.setupAnimationVideo();
  }

  verifyElements() {
    const criticalElements = [
      "crosswordGrid",
      "topicSelect",
      "difficultySelect",
      "animationContainer",
      "introAnimation",
      "allClues",
      "cluesPanel",
    ];

    const missing = [];
    criticalElements.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) {
        missing.push(id);
        console.error(`Critical element with id "${id}" not found!`);
      } else {
        console.log(`✓ Found element: ${id}`);
      }
    });

    if (missing.length > 0) {
      console.error("Missing critical elements:", missing);
      alert(
        `Error: Missing critical elements: ${missing.join(
          ", "
        )}. Please check the HTML.`
      );
    }
  }

  // ---- Backend-only gating: frontend no-ops ----
  isAuthenticated() {
    try {
      return !!localStorage.getItem("token");
    } catch (_) {
      return false;
    }
  }

  // Frontend no longer tracks plays; server enforces limits
  canStartGame() {
    return true;
  }
  markGameStartedSuccessfully() {
    /* no-op: server records usage */
  }

  normalizeGrid(grid) {
    return GridUtils.normalizeGrid(grid);
  }

  initializeGrid() {
    const gridContainer = document.getElementById("crosswordGrid");
    if (!gridContainer) {
      console.error("Crossword grid container not found!");
      return;
    }

    // Hide grid initially - will be shown after backend response
    gridContainer.style.display = "none";
    gridContainer.innerHTML = "";

    // Use solution grid shape; if not loaded yet, skip rendering
    if (!this.solutionGrid || !this.solutionGrid.length) {
      console.log("No solution grid available, showing animation");
      this.grid = [];
      // Show animation when grid is empty
      this.showAnimationVideo();
      return;
    }

    console.log("Initializing grid with size:", this.solutionGrid.length);

    // Keep video visible - will hide after grid is fully rendered

    // Set grid template based on current solution grid size
    this.gridSize = this.solutionGrid.length;

    // Set grid template based on current grid size
    gridContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${this.gridSize}, 1fr)`;

    // Create grid
    for (let row = 0; row < this.gridSize; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Add black cells for empty spaces
        if (
          !this.solutionGrid[row][col] ||
          this.solutionGrid[row][col] === ""
        ) {
          cell.classList.add("black");
        } else {
          const input = document.createElement("input");
          input.type = "text";
          input.maxLength = 1;
          input.addEventListener("input", (e) =>
            this.inputHandler.handleInput(e, row, col)
          );
          input.addEventListener("keydown", (e) =>
            this.inputHandler.handleKeyDown(e, row, col)
          );
          cell.appendChild(input);

          // Add cell numbers
          const number = this.getCellNumber(row, col);
          if (number) {
            const numberSpan = document.createElement("span");
            numberSpan.className = "cell-number";
            numberSpan.textContent = number;
            numberSpan.dataset.wordNumber = String(number);
            numberSpan.addEventListener("click", (ev) => {
              ev.stopPropagation();
              this.definitions.showDefinitionPopup(String(number), cell);
            });
            cell.appendChild(numberSpan);
          }
        }

        // Only add click listener to non-black cells
        if (!cell.classList.contains("black")) {
          cell.addEventListener("click", () => this.selectCell(row, col));
        }
        gridContainer.appendChild(cell);
        this.grid[row][col] = cell;
      }
    }

    // Adjust grid size after DOM is updated
    // Use requestAnimationFrame to ensure container is properly sized
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log(
          "Adjusting grid size, grid cells created:",
          this.grid.length
        );
        this.gridSizing.adjustGridSize();
        this.hideAnimationVideo();
        // Ensure grid is visible
        if (gridContainer) {
          gridContainer.style.display = "grid";
          console.log("Grid container display set to grid");
        }
      });
    });
  }

  isBlackCell(row, col) {
    // Define black cells (empty spaces) in the grid
    const blackCells = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [0, 6],
      [0, 7],
      [0, 8],
      [0, 9],
      [0, 10],
      [0, 11],
      [0, 12],
      [0, 13],
      [0, 14],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 7],
      [1, 8],
      [1, 9],
      [1, 10],
      [1, 11],
      [1, 12],
      [1, 13],
      [1, 14],
      [3, 0],
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
      [3, 5],
      [3, 6],
      [3, 7],
      [3, 8],
      [3, 9],
      [3, 10],
      [3, 11],
      [3, 12],
      [3, 13],
      [3, 14],
      [5, 0],
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 4],
      [5, 5],
      [5, 6],
      [5, 7],
      [5, 8],
      [5, 9],
      [5, 10],
      [5, 11],
      [5, 12],
      [5, 13],
      [5, 14],
      [7, 0],
      [7, 1],
      [7, 2],
      [7, 3],
      [7, 4],
      [7, 5],
      [7, 6],
      [7, 7],
      [7, 8],
      [7, 9],
      [7, 10],
      [7, 11],
      [7, 12],
      [7, 13],
      [7, 14],
      [9, 0],
      [9, 1],
      [9, 2],
      [9, 3],
      [9, 4],
      [9, 5],
      [9, 6],
      [9, 7],
      [9, 8],
      [9, 9],
      [9, 10],
      [9, 11],
      [9, 12],
      [9, 13],
      [9, 14],
      [11, 0],
      [11, 1],
      [11, 2],
      [11, 3],
      [11, 4],
      [11, 5],
      [11, 6],
      [11, 7],
      [11, 8],
      [11, 9],
      [11, 10],
      [11, 11],
      [11, 12],
      [11, 13],
      [11, 14],
      [13, 0],
      [13, 1],
      [13, 2],
      [13, 3],
      [13, 4],
      [13, 5],
      [13, 6],
      [13, 7],
      [13, 8],
      [13, 9],
      [13, 10],
      [13, 11],
      [13, 12],
      [13, 13],
      [13, 14],
      [14, 0],
      [14, 1],
      [14, 2],
      [14, 3],
      [14, 4],
      [14, 5],
      [14, 6],
      [14, 7],
      [14, 8],
      [14, 9],
      [14, 10],
      [14, 11],
      [14, 12],
      [14, 13],
      [14, 14],
    ];
    return blackCells.some(([r, c]) => r === row && c === col);
  }

  getCellNumber(row, col) {
    // Return cell number if this is the start of a word
    for (const [num, word] of Object.entries(this.words)) {
      if (word.start[0] === row && word.start[1] === col) {
        return num;
      }
    }
    return null;
  }

  selectCell(row, col) {
    // Clear previous selections
    this.clearSelections();

    // Find which word this cell belongs to
    const wordInfo = this.getWordAt(row, col);
    if (wordInfo) {
      this.currentWord = wordInfo.number;
      this.currentDirection = wordInfo.direction;
      this.highlightWord(wordInfo.number, wordInfo.direction);
      this.highlightClue(wordInfo.number);
    }

    // Highlight the cell
    this.grid[row][col].classList.add("active");
  }

  getWordAt(row, col) {
    for (const [num, word] of Object.entries(this.words)) {
      const [startRow, startCol] = word.start;
      if (word.direction === "across") {
        if (
          row === startRow &&
          col >= startCol &&
          col < startCol + word.length
        ) {
          return { number: num, direction: "across" };
        }
      } else {
        if (
          col === startCol &&
          row >= startRow &&
          row < startRow + word.length
        ) {
          return { number: num, direction: "down" };
        }
      }
    }
    return null;
  }

  highlightWord(wordNum, direction) {
    const word = this.words[wordNum];
    const [startRow, startCol] = word.start;

    for (let i = 0; i < word.length; i++) {
      const row = direction === "across" ? startRow : startRow + i;
      const col = direction === "across" ? startCol + i : startCol;
      this.grid[row][col].classList.add("highlighted");
    }
  }

  highlightClue(wordNum) {
    // Remove active class from all clues
    document.querySelectorAll(".clue-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Add active class to current clue
    const clueItem = document.querySelector(`[data-word="${wordNum}"]`);
    if (clueItem) {
      clueItem.classList.add("active");
    }
  }

  clearSelections() {
    // Clear all highlights
    document.querySelectorAll(".grid-cell").forEach((cell) => {
      cell.classList.remove("active", "highlighted");
    });

    document.querySelectorAll(".clue-item").forEach((item) => {
      item.classList.remove("active");
    });
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // Setup tooltip positioning for desktop sidebar buttons
    this.setupTooltips();

    // Clue click handlers
    document.querySelectorAll(".clue-item").forEach((item) => {
      item.addEventListener("click", () => {
        const wordNum = item.dataset.word;
        this.selectWord(wordNum);
      });
    });

    // Dropdown change handlers
    document.getElementById("topicSelect").addEventListener("change", (e) => {
      this.handleTopicChange(e.target.value);
    });

    document
      .getElementById("difficultySelect")
      .addEventListener("change", (e) => {
        this.handleDifficultyChange(e.target.value);
      });

    // Start game button handler - handle all new game buttons
    const newGameButtonIds = [
      "newGameBtn",
      "desktopNewGameBtn",
      "mobileNewGameBtn",
      "tabletNewGameBtn",
    ];
    console.log("Setting up new game button listeners...");

    newGameButtonIds.forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        console.log(`✓ Found and attaching listener to: ${btnId}`, btn);
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`>>> New Game button clicked: ${btnId}`);
          this.newGame();
        });
      } else {
        console.warn(`✗ Button not found: ${btnId}`);
      }
    });

    // Control button handlers
    document
      .getElementById("hintBtn")
      ?.addEventListener("click", () => this.showHint());
    document
      .getElementById("checkPuzzleBtn")
      ?.addEventListener("click", () => this.checkPuzzle());
    document
      .getElementById("hintWordBtn")
      ?.addEventListener("click", () => this.hintWord());
    document
      .getElementById("checkWordBtn")
      ?.addEventListener("click", () => this.checkWord());
    document
      .getElementById("restartBtn")
      ?.addEventListener("click", () => this.restartGame());

    // Mobile button handlers
    document
      .getElementById("mobileHintBtn")
      ?.addEventListener("click", () => this.hintWord());
    document
      .getElementById("mobileCheckBtn")
      ?.addEventListener("click", () => this.checkWord());
    document
      .getElementById("mobileDefsBtn")
      ?.addEventListener("click", () => this.definitions.toggleDefinitions());
    document
      .getElementById("mobileSignInBtn")
      ?.addEventListener("click", () => {
        const signInBtn = document.getElementById("signInBtn");
        if (signInBtn) signInBtn.click();
      });

    // Tablet button handlers (tabletNewGameBtn already handled above)
    // Tablet sign in button is handled by auth.js updateUI() - no need for separate handler
    // The onclick is set dynamically based on authentication state
    document
      .getElementById("tabletHintBtn")
      ?.addEventListener("click", () => this.hintWord());
    document
      .getElementById("tabletCheckBtn")
      ?.addEventListener("click", () => this.checkWord());

    // Clues panel toggle (mobile)
    const cluesToggleBtn = document.getElementById("cluesToggleBtn");
    const cluesPanel = document.getElementById("cluesPanel");
    const cluesCloseBtn = document.getElementById("cluesCloseBtn");
    const cluesBackdrop = document.getElementById("cluesBackdrop");

    const openCluesPanel = () => {
      if (cluesPanel) cluesPanel.classList.add("mobile-open");
      if (cluesBackdrop) cluesBackdrop.classList.add("active");
    };

    const closeCluesPanel = () => {
      if (cluesPanel) cluesPanel.classList.remove("mobile-open");
      if (cluesBackdrop) cluesBackdrop.classList.remove("active");
    };

    if (cluesToggleBtn) {
      cluesToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (cluesPanel && cluesPanel.classList.contains("mobile-open")) {
          closeCluesPanel();
        } else {
          openCluesPanel();
        }
      });
    }

    if (cluesCloseBtn) {
      cluesCloseBtn.addEventListener("click", closeCluesPanel);
    }

    if (cluesBackdrop) {
      cluesBackdrop.addEventListener("click", closeCluesPanel);
    }

    // Tablet clue panel toggle
    const tabletClueHeader = document.getElementById("tabletClueHeader");
    const tabletCluePanel = document.getElementById("tabletCluePanel");
    const tabletClueClose = document.getElementById("tabletClueClose");

    const openTabletCluePanel = () => {
      if (tabletCluePanel) {
        tabletCluePanel.classList.add("open");
      }
    };

    const closeTabletCluePanel = () => {
      if (tabletCluePanel) {
        tabletCluePanel.classList.remove("open");
      }
    };

    if (tabletClueHeader) {
      tabletClueHeader.addEventListener("click", (e) => {
        e.stopPropagation();
        if (tabletCluePanel && tabletCluePanel.classList.contains("open")) {
          closeTabletCluePanel();
        } else {
          openTabletCluePanel();
        }
      });
    }

    if (tabletClueClose) {
      tabletClueClose.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTabletCluePanel();
      });
    }

    // Also close on window resize if switching to desktop view (>1024px)
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024) {
        closeCluesPanel();
        closeTabletCluePanel();
      }
      // Sync panel height with grid on all screen sizes
      this.gridSizing.syncPanelHeightWithGrid();
    });

    // Sync panel height with grid on initial load (all screen sizes)
    this.gridSizing.syncPanelHeightWithGrid();

    // Desktop definitions button folds/unfolds existing list
    document
      .getElementById("definitionsBtn")
      ?.addEventListener("click", () => this.definitions.toggleDefinitions());

    // Definitions overlay controls
    document
      .getElementById("definitionsBtn")
      ?.addEventListener("click", () =>
        this.definitions.openDefinitionsOverlay()
      );
    document
      .getElementById("defsCloseBtn")
      ?.addEventListener("click", () =>
        this.definitions.closeDefinitionsOverlay()
      );
    const defsOverlay = document.getElementById("defsOverlay");
    if (defsOverlay) {
      defsOverlay.addEventListener("click", (e) => {
        if (e.target === defsOverlay)
          this.definitions.closeDefinitionsOverlay();
      });
    }
  }

  selectWord(wordNum) {
    this.clearSelections();
    this.currentWord = wordNum;

    const word = this.words[wordNum];
    this.currentDirection = word.direction;

    this.highlightWord(wordNum, word.direction);
    this.highlightClue(wordNum);

    // Focus on first cell of the word
    const [startRow, startCol] = word.start;
    const firstCell = this.grid[startRow][startCol];
    const input = firstCell.querySelector("input");
    if (input) {
      input.focus();
    }
  }

  showHint() {
    if (!this.currentWord) {
      alert(t("select_word_first"));
      return;
    }

    const word = this.words[this.currentWord];
    const [startRow, startCol] = word.start;

    // Reveal first letter as hint
    const firstCell = this.grid[startRow][startCol];
    const input = firstCell.querySelector("input");
    if (input && !input.value) {
      input.value = word.word[0];
      input.style.color = "#48bb78";
    }
  }

  hintWord() {
    if (!this.currentWord) {
      alert(t("select_word_first"));
      return;
    }

    const word = this.words[this.currentWord];
    const [startRow, startCol] = word.start;

    // Reveal the entire word
    for (let i = 0; i < word.length; i++) {
      const row = this.currentDirection === "across" ? startRow : startRow + i;
      const col = this.currentDirection === "across" ? startCol + i : startCol;
      const cell = this.grid[row][col];
      const input = cell.querySelector("input");
      if (input) {
        input.value = word.word[i];
        input.style.color = "#48bb78";
      }
    }
  }

  checkWord() {
    if (!this.currentWord) {
      alert(t("select_word_first"));
      return;
    }

    const word = this.words[this.currentWord];
    const [startRow, startCol] = word.start;
    let userWord = "";

    for (let i = 0; i < word.length; i++) {
      const row = this.currentDirection === "across" ? startRow : startRow + i;
      const col = this.currentDirection === "across" ? startCol + i : startCol;
      const cell = this.grid[row][col];
      const input = cell.querySelector("input");
      userWord += input ? input.value : "";
    }

    if (userWord === word.word) {
      alert(t("correct"));
      // Highlight correct word
      for (let i = 0; i < word.length; i++) {
        const row =
          this.currentDirection === "across" ? startRow : startRow + i;
        const col =
          this.currentDirection === "across" ? startCol + i : startCol;
        const cell = this.grid[row][col];
        cell.style.background = "#c6f6d5";
      }
    } else {
      alert(t("incorrect"));
    }
  }

  checkPuzzle() {
    let correctWords = 0;
    let totalWords = Object.keys(this.words).length;

    for (const [wordNum, word] of Object.entries(this.words)) {
      const [startRow, startCol] = word.start;
      let userWord = "";

      for (let i = 0; i < word.length; i++) {
        const row = word.direction === "across" ? startRow : startRow + i;
        const col = word.direction === "across" ? startCol + i : startCol;
        const cell = this.grid[row][col];
        const input = cell.querySelector("input");
        userWord += input ? input.value : "";
      }

      if (userWord === word.word) {
        correctWords++;
      }
    }

    const percentage = Math.round((correctWords / totalWords) * 100);
    alert(
      t("puzzle_progress", {
        correct: correctWords,
        total: totalWords,
        percent: percentage,
      })
    );

    if (correctWords === totalWords) {
      alert(t("puzzle_solved"));
      this.stopTimer();
    }
  }

  newGame() {
    console.log("newGame() called");
    // Check if user is authenticated
    const isAuth = this.isAuthenticated();
    console.log("User authenticated:", isAuth);

    if (!isAuth) {
      // Guest user - show login modal
      console.log("User not authenticated, showing login modal");
      const signInBtn = document.getElementById("signInBtn");
      if (signInBtn) {
        signInBtn.click();
      } else {
        console.error("signInBtn not found!");
      }
      return;
    }

    // Registered user - show start button prompt first, then modal
    console.log("User authenticated, showing game controls modal");
    this.showGameControlsModal();
  }

  // showStartButtonPrompt() {
  //   console.log("Showing start button prompt");
  //   // Remove existing prompt if any
  //   const existingPrompt = document.querySelector(".start-prompt");
  //   if (existingPrompt) {
  //     existingPrompt.remove();
  //   }

  //   const prompt = document.createElement("div");
  //   prompt.className = "start-prompt";
  //   prompt.innerHTML = `
  //     <div class="start-prompt-content">
  //       <h2>Ready to Play?</h2>
  //       <p>Click Start to choose your topic and difficulty</p>
  //       <button class="btn btn-primary" id="startPromptBtn">
  //         ${t("btn_start_game") || "Start Game"}
  //       </button>
  //       <button class="btn btn-secondary start-prompt-close" id="startPromptCloseBtn">
  //         Cancel
  //       </button>
  //     </div>
  //   `;

  //   document.body.appendChild(prompt);

  //   // Add event listeners
  //   const startPromptBtn = document.getElementById("startPromptBtn");
  //   const startPromptCloseBtn = document.getElementById("startPromptCloseBtn");

  //   if (startPromptBtn) {
  //     startPromptBtn.addEventListener("click", () => {
  //       console.log("Start prompt button clicked, showing game controls modal");
  //       this.closeStartPrompt();
  //       this.showGameControlsModal();
  //     });
  //   }

  //   if (startPromptCloseBtn) {
  //     startPromptCloseBtn.addEventListener("click", () => {
  //       this.closeStartPrompt();
  //     });
  //   }

  //   // Close on backdrop click
  //   prompt.addEventListener("click", (e) => {
  //     if (e.target.classList.contains("start-prompt")) {
  //       this.closeStartPrompt();
  //     }
  //   });

  //   // Show prompt with animation
  //   setTimeout(() => {
  //     prompt.classList.add("show");
  //   }, 10);
  // }

  // closeStartPrompt() {
  //   const prompt = document.querySelector(".start-prompt");
  //   if (prompt) {
  //     prompt.classList.remove("show");
  //     setTimeout(() => {
  //       prompt.remove();
  //     }, 300);
  //   }
  // }

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

    // Sync dropdowns with current values
    const topicSelect = document.getElementById("topicSelect");
    const difficultySelect = document.getElementById("difficultySelect");
    const modalTopicSelect = document.getElementById("modalTopicSelect");
    const customThemeRow = document.getElementById("customThemeRow");
    const customThemeInput = document.getElementById("customThemeInput");
    const modalDifficultySelect = document.getElementById(
      "modalDifficultySelect"
    );

    if (topicSelect && modalTopicSelect) {
      modalTopicSelect.value = topicSelect.value;
    }
    if (difficultySelect && modalDifficultySelect) {
      modalDifficultySelect.value = difficultySelect.value;
    }

    // Add event listeners
    modal.querySelector(".game-modal-close").addEventListener("click", () => {
      this.closeGameModal();
    });

    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("game-modal")) {
        this.closeGameModal();
      }
    });

    // Toggle custom theme input visibility
    const syncCustomVisibility = () => {
      if (!customThemeRow) return;
      const show = modalTopicSelect && modalTopicSelect.value === "General";
      customThemeRow.style.display = show ? "block" : "none";
      if (show && this.customTopic) customThemeInput.value = this.customTopic;
    };
    if (modalTopicSelect) {
      modalTopicSelect.addEventListener("change", syncCustomVisibility);
      syncCustomVisibility();
    }

    const modalStartGameBtn = document.getElementById("modalStartGameBtn");
    if (!modalStartGameBtn) {
      console.error("modalStartGameBtn not found after creating modal!");
      alert("Error: Start game button not found. Please refresh the page.");
      return;
    }

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
        this.customTopic = entered;
        console.log("Custom topic set:", this.customTopic);
      }

      this.closeGameModal();
      console.log("Starting game via gameApi.startGame()");
      this.gameApi.startGame();
    });

    // Add animation - ensure modal is visible
    console.log("Modal created, element:", modal);
    console.log("Modal parent:", modal.parentElement);
    console.log("Modal computed style before show:", {
      display: window.getComputedStyle(modal).display,
      opacity: window.getComputedStyle(modal).opacity,
      visibility: window.getComputedStyle(modal).visibility,
      zIndex: window.getComputedStyle(modal).zIndex,
    });

    // Force modal to be visible immediately for testing
    modal.style.display = "flex";
    modal.style.opacity = "1";
    modal.style.visibility = "visible";

    setTimeout(() => {
      modal.classList.add("show");
      console.log("Modal show class added");
      console.log("Modal computed style after show:", {
        display: window.getComputedStyle(modal).display,
        opacity: window.getComputedStyle(modal).opacity,
        visibility: window.getComputedStyle(modal).visibility,
        zIndex: window.getComputedStyle(modal).zIndex,
      });

      // Verify modal is in DOM
      const checkModal = document.querySelector(".game-modal");
      if (!checkModal) {
        console.error("Modal not found in DOM after creation!");
      } else {
        console.log(
          "Modal found in DOM, has show class:",
          checkModal.classList.contains("show")
        );
        console.log("Modal is visible:", checkModal.offsetParent !== null);
        console.log("Modal dimensions:", {
          width: checkModal.offsetWidth,
          height: checkModal.offsetHeight,
        });
      }
    }, 10);
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

  setupTooltips() {
    // Only setup tooltips for desktop
    if (window.innerWidth < 1025) return;

    const tooltipWrappers = document.querySelectorAll(
      ".left-sidebar.desktop-only .tooltip-wrapper"
    );

    tooltipWrappers.forEach((wrapper) => {
      const img = wrapper.querySelector("img");
      if (!img) return;

      wrapper.addEventListener("mouseenter", (e) => {
        const rect = img.getBoundingClientRect();

        // Create tooltip element if it doesn't exist
        let tooltipEl = wrapper._tooltipEl;
        if (!tooltipEl) {
          tooltipEl = document.createElement("div");
          tooltipEl.className = "custom-tooltip";
          tooltipEl.textContent = wrapper.getAttribute("data-tooltip");
          document.body.appendChild(tooltipEl);
          wrapper._tooltipEl = tooltipEl;
        }

        // Position tooltip to the right of the button
        const left = rect.right + 12;
        const top = rect.top + rect.height / 2;

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
        tooltipEl.style.transform = "translateY(-50%)";
        tooltipEl.style.opacity = "1";
        tooltipEl.style.visibility = "visible";

        // Create arrow
        let arrow = wrapper._arrow;
        if (!arrow) {
          arrow = document.createElement("div");
          arrow.className = "custom-tooltip-arrow";
          document.body.appendChild(arrow);
          wrapper._arrow = arrow;
        }

        arrow.style.left = `${rect.right + 6}px`;
        arrow.style.top = `${top}px`;
        arrow.style.transform = "translateY(-50%)";
        arrow.style.opacity = "1";
        arrow.style.visibility = "visible";
      });

      wrapper.addEventListener("mouseleave", () => {
        if (wrapper._tooltipEl) {
          wrapper._tooltipEl.style.opacity = "0";
          wrapper._tooltipEl.style.visibility = "hidden";
        }
        if (wrapper._arrow) {
          wrapper._arrow.style.opacity = "0";
          wrapper._arrow.style.visibility = "hidden";
        }
      });
    });
  }

  restartGame() {
    if (confirm(t("confirm_restart"))) {
      // Clear all inputs
      document.querySelectorAll(".grid-cell input").forEach((input) => {
        input.value = "";
        input.style.color = "#2d3748";
      });

      // Clear selections
      this.clearSelections();

      // Reset timer
      this.startTime = Date.now();
      this.updateTimer();
    }
  }

  clearGame() {
    // Stop timer
    this.stopTimer();

    // Clear game state
    this.currentWord = null;
    this.currentDirection = "across";
    this.startTime = Date.now();
    this.solutionGrid = [];
    this.grid = [];
    this.words = {};
    this.definitionsData = {};

    // Clear grid display and hide it
    const gridContainer = document.getElementById("crosswordGrid");
    if (gridContainer) {
      gridContainer.innerHTML = "";
      gridContainer.style.display = "none";
    }

    // Clear clues
    const allCluesEl = document.getElementById("allClues");
    if (allCluesEl) {
      allCluesEl.innerHTML = "";
    }

    // Clear tablet clue panel
    const tabletClueContent = document.getElementById("tabletClueContent");
    if (tabletClueContent) {
      tabletClueContent.innerHTML = "";
    }

    // Clear selections
    this.clearSelections();

    // Reset timer display
    this.updateTimer();

    // Show animation again since grid is now empty
    this.showAnimationVideo();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Update desktop timer (in sidebar)
    const el = document.getElementById("timer");
    if (el) {
      el.textContent = timeString;
    }

    // Update mobile timer
    const mobileTimer = document.getElementById("mobileTimer");
    if (mobileTimer) {
      mobileTimer.textContent = timeString;
    }

    // Update tablet timer
    const tabletTimer = document.getElementById("tabletTimer");
    if (tabletTimer) {
      tabletTimer.textContent = timeString;
    }
  }

  handleTopicChange(topic) {
    console.log("Topic changed to:", topic);
    // Here you would typically generate a new puzzle based on the topic
    // For now, we'll just show a message
    alert(t("topic_changed", { topic }));
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

    if (newGridSize !== this.gridSize) {
      this.gridSize = newGridSize;
      this.initializeGrid();
      alert(t("grid_size_changed", { size: newGridSize, difficulty }));
    }
  }
  syncPanelHeightWithGrid() {
    // Delegate to gridSizing module
    this.gridSizing.syncPanelHeightWithGrid();
  }

  setupAnimationVideo() {
    // Animation will be shown/hidden by initializeGrid and hideAnimationVideo
    // This method is just for initial setup if needed
    const video = document.getElementById("introAnimation");
    const container = document.getElementById("animationContainer");

    if (!video || !container) return;

    // Show animation initially if grid is empty
    if (!this.solutionGrid || !this.solutionGrid.length) {
      this.showAnimationVideo();
    }
  }

  showAnimationVideo() {
    const video = document.getElementById("introAnimation");
    const container = document.getElementById("animationContainer");
    const gameArea = document.querySelector(".game-area");

    if (!video || !container) return;

    // Show animation container
    container.style.display = "flex";
    container.classList.remove("hidden");

    // Disable horizontal scroll when video is showing
    if (gameArea) {
      gameArea.style.overflowX = "hidden";
    }

    // Try to play video (autoplay may be blocked)
    video.play().catch(() => {
      // Autoplay blocked, video will play on user interaction
      console.log("Video autoplay was blocked");
    });
  }

  hideAnimationVideo() {
    const video = document.getElementById("introAnimation");
    const container = document.getElementById("animationContainer");
    const gameArea = document.querySelector(".game-area");

    if (!video || !container) return;

    // Pause video
    video.pause();

    // Hide container with fade out
    container.classList.add("hidden");

    // Re-enable horizontal scroll when grid is showing (only on mobile/iPad)
    if (gameArea && window.innerWidth <= 1024) {
      gameArea.style.overflowX = "auto";
    }

    // Remove from display after transition
    setTimeout(() => {
      container.style.display = "none";
    }, 500);
  }

  applyI18nUI() {
    try {
      const start = document.getElementById("startGameBtn");
      if (start) {
        if (start.tagName === "SVG") {
          start.alt = t("newGameBtn");
        } else {
          start.textContent = t("btn_start_game");
        }
      }
      const hint = document.getElementById("hintWordBtn");
      if (hint) {
        if (hint.tagName === "IMG") {
          hint.alt = t("btn_hint");
        } else {
          hint.textContent = t("btn_hint");
        }
      }
      const check = document.getElementById("checkWordBtn");
      if (check) {
        if (check.tagName === "IMG") {
          check.alt = t("btn_check_puzzle");
        } else {
          check.textContent = t("btn_check_puzzle");
        }
      }
      const newBtn = document.getElementById("newGameBtn");
      if (newBtn) {
        if (newBtn.tagName === "IMG") {
          newBtn.alt = t("btn_new_game");
        } else {
          const img = newBtn.querySelector("img");
          if (img) {
            img.alt = t("btn_new_game");
          } else {
            newBtn.textContent = t("btn_new_game");
          }
        }
      }

      // Clues titles removed - all clues shown in number order

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
    } catch (_) {}
  }
}

// (moved to module entry)
