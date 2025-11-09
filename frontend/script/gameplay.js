// API_BASE is set by config.js - use window.API_BASE
import { GridUtils } from "./game/gridUtils.js";
import { GridSizing } from "./game/gridSizing.js";
import { InputHandler } from "./game/inputHandler.js";
import { GameApi } from "./game/gameApi.js";
import { TopicDifficulty } from "./game/topicDifficulty.js";
import { HintHandler } from "./game/hintHandler.js";
import { VideoHandler } from "./game/videoHandler.js";
import { PuzzleChecker } from "./game/puzzleChecker.js";
import { WordSelector } from "./game/wordSelector.js";
import { TooltipHandler } from "./game/tooltipHandler.js";
import { TimerHandler } from "./game/timerHandler.js";
import { Definitions } from "./game/definitions.js";
import { t } from "./strings.js";

export default class CrosswordGame {
  constructor() {
    this.currentWord = null;
    this.currentDirection = "across";
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
    this.topicDifficulty = new TopicDifficulty(this);
    this.hintHandler = new HintHandler(this);
    this.videoHandler = new VideoHandler(this);
    this.puzzleChecker = new PuzzleChecker(this);
    this.wordSelector = new WordSelector(this);
    this.tooltipHandler = new TooltipHandler(this);
    this.timerHandler = new TimerHandler(this);

    this.verifyElements();
    // Show video immediately on page load (before any game is started)
    // Do this first to ensure video is visible before anything else
    this.videoHandler.ensureVideoVisible();
    this.videoHandler.setupAnimationVideo();
    this.initializeGrid();
    this.setupEventListeners();
    // Don't start timer here - wait until grid is visible
    // Timer will be started in gameApi.startGame() after grid is rendered
    this.timerHandler.updateTimer(); // Just show 00:00 initially
    this.gridSizing.setupResponsiveGrid();
    this.applyI18nUI();
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
      this.videoHandler.showAnimationVideo();
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
          const number = this.wordSelector.getCellNumber(row, col);
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
          cell.addEventListener("click", () =>
            this.wordSelector.selectCell(row, col)
          );
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
        this.videoHandler.hideAnimationVideo();
        // Ensure grid is visible
        if (gridContainer) {
          gridContainer.style.display = "grid";
          console.log("Grid container display set to grid");
        }
      });
    });
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // Setup tooltip positioning for desktop sidebar buttons - delegated to TooltipHandler
    this.tooltipHandler.setupTooltips();

    // Clue click handlers
    document.querySelectorAll(".clue-item").forEach((item) => {
      item.addEventListener("click", () => {
        const wordNum = item.dataset.word;
        this.wordSelector.selectWord(wordNum);
      });
    });

    // Dropdown change handlers - delegated to TopicDifficulty
    this.topicDifficulty.setupEventListeners();

    // Start game button handler - handle all start/new game buttons
    const newGameButtonIds = [
      "newGameBtn",
      "startGameBtn",
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
          console.log(`New Game button clicked: ${btnId}`);
          this.newGame();
        });
      } else {
        console.warn(`✗ Button not found: ${btnId}`);
      }
    });

    // Hint button handlers - delegated to HintHandler
    this.hintHandler.setupEventListeners();

    // Check/submit puzzle button handlers - delegated to PuzzleChecker
    this.puzzleChecker.setupEventListeners();

    document
      .getElementById("restartBtn")
      ?.addEventListener("click", () => this.restartGame());
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
    // Note: tabletCheckBtn is now handled by the js-check-puzzle-btn class selector above

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

    // Registered user - show game controls modal
    console.log("User authenticated, showing game controls modal");
    this.topicDifficulty.showGameControlsModal();
  }

  restartGame() {
    if (confirm(t("confirm_restart"))) {
      // Clear all inputs
      document.querySelectorAll(".grid-cell input").forEach((input) => {
        input.value = "";
        input.style.color = "#2d3748";
      });

      // Clear selections
      this.wordSelector.clearSelections();

      // Reset timer
      this.timerHandler.resetTimer();
    }
  }

  clearGame() {
    console.log("Clearing game state and showing video.");

    // Stop timer
    this.timerHandler.stopTimer();

    // Clear game state variables
    this.currentWord = null;
    this.solutionGrid = [];
    this.grid = [];
    this.words = {};

    // Clear the visual grid and hide it
    const gridContainer = document.getElementById("crosswordGrid");
    if (gridContainer) {
      gridContainer.innerHTML = "";
      gridContainer.style.display = "none";
    }

    // Clear the clue lists
    const allCluesEl = document.getElementById("allClues");
    if (allCluesEl) allCluesEl.innerHTML = "";

    const tabletClueContent = document.getElementById("tabletClueContent");
    if (tabletClueContent) tabletClueContent.innerHTML = "";

    // Show the animation video again
    this.videoHandler.showAnimationVideo();
  }

  syncPanelHeightWithGrid() {
    // Delegate to gridSizing module
    this.gridSizing.syncPanelHeightWithGrid();
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
      // Apply i18n to hint buttons - delegated to HintHandler
      this.hintHandler.applyI18n();
      // Apply i18n to check/submit puzzle buttons - delegated to PuzzleChecker
      this.puzzleChecker.applyI18n();
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

      // Apply i18n to topic and difficulty - delegated to TopicDifficulty
      this.topicDifficulty.applyI18n();
    } catch (_) {}
  }
}
