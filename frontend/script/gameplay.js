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

    // Get puzzle dimensions
    const puzzleRows = this.solutionGrid.length;
    const puzzleCols = this.solutionGrid[0] ? this.solutionGrid[0].length : 0;

    // Calculate max visible cells if not already calculated
    if (
      this.gridSizing.maxVisibleRows === 0 ||
      this.gridSizing.maxVisibleCols === 0
    ) {
      this.gridSizing.calculateMaxVisibleCells();
    }

    // Fit or Scroll: Use Math.max to determine final grid size
    // If puzzle is smaller than container, grid fills container
    // If puzzle is larger than container, grid is puzzle size (scrollable)
    const finalRows = Math.max(puzzleRows, this.gridSizing.maxVisibleRows);
    const finalCols = Math.max(puzzleCols, this.gridSizing.maxVisibleCols);

    // Calculate centering offsets when puzzle is smaller than container
    const rowOffset = Math.floor((finalRows - puzzleRows) / 2);
    const colOffset = Math.floor((finalCols - puzzleCols) / 2);

    // Store original puzzle size for reference
    this.gridSize = puzzleRows;
    this.finalGridRows = finalRows;
    this.finalGridCols = finalCols;
    this.puzzleRowOffset = rowOffset;
    this.puzzleColOffset = colOffset;
    this.puzzleRows = puzzleRows;
    this.puzzleCols = puzzleCols;

    console.log("Fit or Scroll calculation:", {
      puzzleRows,
      puzzleCols,
      maxVisibleRows: this.gridSizing.maxVisibleRows,
      maxVisibleCols: this.gridSizing.maxVisibleCols,
      finalRows,
      finalCols,
      rowOffset,
      colOffset,
    });

    // Set grid template based on final calculated size
    gridContainer.style.gridTemplateColumns = `repeat(${finalCols}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${finalRows}, 1fr)`;

    // Create grid - use final size for DOM, but only populate puzzle cells
    for (let row = 0; row < this.finalGridRows; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.finalGridCols; col++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Calculate puzzle coordinates (accounting for centering offset)
        const puzzleRow = row - rowOffset;
        const puzzleCol = col - colOffset;

        // Check if this cell is within the puzzle bounds
        const isWithinPuzzle =
          puzzleRow >= 0 &&
          puzzleRow < puzzleRows &&
          puzzleCol >= 0 &&
          puzzleCol < puzzleCols;

        if (!isWithinPuzzle) {
          // Cell is outside puzzle bounds - add as black/empty cell
          cell.classList.add("black");
        } else if (
          !this.solutionGrid[puzzleRow][puzzleCol] ||
          this.solutionGrid[puzzleRow][puzzleCol] === ""
        ) {
          // Within puzzle bounds but empty - black cell
          cell.classList.add("black");
        } else {
          const input = document.createElement("input");
          input.type = "text";
          input.maxLength = 1;
          input.addEventListener("input", (e) =>
            this.inputHandler.handleInput(e, puzzleRow, puzzleCol)
          );
          input.addEventListener("keydown", (e) =>
            this.inputHandler.handleKeyDown(e, puzzleRow, puzzleCol)
          );
          cell.appendChild(input);

          // Add cell numbers (use puzzle coordinates)
          const number = this.wordSelector.getCellNumber(puzzleRow, puzzleCol);
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
            this.wordSelector.selectCell(puzzleRow, puzzleCol)
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
          this.updateSaveGameButtonVisibility(); // Show save button now that game is active
        }
      });
    });
  }

  // Helper methods for coordinate translation between puzzle and grid coordinates
  getGridCell(puzzleRow, puzzleCol) {
    // Translate puzzle coordinates to grid coordinates
    const gridRow = puzzleRow + (this.puzzleRowOffset || 0);
    const gridCol = puzzleCol + (this.puzzleColOffset || 0);
    if (this.grid[gridRow] && this.grid[gridRow][gridCol]) {
      return this.grid[gridRow][gridCol];
    }
    return null;
  }

  getPuzzleCoords(gridRow, gridCol) {
    // Translate grid coordinates to puzzle coordinates
    const puzzleRow = gridRow - (this.puzzleRowOffset || 0);
    const puzzleCol = gridCol - (this.puzzleColOffset || 0);
    return [puzzleRow, puzzleCol];
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // Setup tooltip positioning for desktop sidebar buttons - delegated to TooltipHandler
    this.tooltipHandler.setupTooltips();

    // Clue click handlers
    document.querySelectorAll(".clue-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
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

    // Save game buttons
    this.updateSaveGameButtonVisibility(); // Initial check
    document.querySelectorAll('.js-save-game-btn').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showSaveGameModal();
      });
    });

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
    const tabletCluePanelHeader = document.getElementById("tabletCluePanelHeader");
    if (tabletCluePanelHeader) {
      tabletCluePanelHeader.textContent = t("clue_panel_title");
    }

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
      // Directly call the auth manager to show the sign-in form
      if (window.__auth) window.__auth.showSignInForm();
      else console.error("Auth manager not found!");
      return;
    }

    // Registered user - show game controls modal
    console.log("User authenticated, showing game controls modal");
    this.topicDifficulty.showGameControlsModal();
  }

  showSaveGameModal() {
    if (!this.isAuthenticated()) {
      alert(t('login_to_save'));
      return;
    }
    // For now, this will call the existing save logic.
    this.createSaveGameModal();
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

  createSaveGameModal() {
    const existing = document.querySelector(".auth-modal");
    if (existing) existing.remove();

    const _ = (k) => (window.t ? t(k) : k);

    const modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.innerHTML = `
      <div class="auth-modal-content profile-modal" id="saveGameModalContent">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${_("save_current_game")}</h2></div>
            <div class="saved-games-container">
              <div class="saved-game-card-wrapper" data-slot="1">
                <div class="saved-game-card"><div class="card-content">${_("loading")}...</div></div>
              </div>
              <div class="saved-game-card-wrapper" data-slot="2">
                <div class="saved-game-card"><div class="card-content">${_("loading")}...</div></div>
              </div>
              <div class="saved-game-card-wrapper" data-slot="3">
                <div class="saved-game-card"><div class="card-content">${_("loading")}...</div></div>
              </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="backToGameBtn">${_("back_to_game")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3><p>${_("save_game_tagline")}</p></div></div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);

    // --- Event Listeners ---
    modal.querySelector('.close-btn')?.addEventListener('click', () => this.closeSaveGameModal());
    modal.querySelector('#backToGameBtn')?.addEventListener('click', () => this.closeSaveGameModal());

    // --- Fetch Saved Games and Populate ---
    const token = localStorage.getItem("token");
    fetch(`${window.API_BASE}/api/v1/saved-games`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(result => {
      if (!result.success) throw new Error(result.error || 'Failed to load saved games.');
      const games = result.saved_games;
      const cardWrappers = modal.querySelectorAll('.saved-game-card-wrapper');
      let emptySlots = 3 - games.length;

      cardWrappers.forEach((wrapper, index) => {
        const game = games[index];
        const card = wrapper.querySelector('.saved-game-card');
        
        if (game) {
          // Populate card with existing game data
          card.dataset.gameId = game.id;
          card.innerHTML = `<div class="card-content"><strong>${game.topic}</strong><br>${game.difficulty}<br><small>${new Date(game.started_at).toLocaleDateString()}</small></div>`;
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-danger btn-delete-game';
          deleteBtn.textContent = _('delete');
          deleteBtn.dataset.gameId = game.id;
          wrapper.appendChild(deleteBtn);

        } else if (emptySlots > 0) {
          // This is an available empty slot
          card.innerHTML = `<div class="card-content">${_("empty_slot")}</div>`;
          card.classList.add('empty-slot');
          emptySlots--;
        } else {
          // All 3 slots are full, and this is beyond the 3rd slot
           card.innerHTML = `<div class="card-content">${_("no_saved_game")}</div>`;
           card.style.cursor = 'default';
           card.style.opacity = '0.6';
        }
      });

      // --- Add Event Listeners After Population ---
      modal.querySelectorAll('.saved-game-card').forEach(card => {
        card.addEventListener('click', () => {
          const gameId = card.dataset.gameId;
          const _ = (k, p) => (window.t ? t(k, p) : k);

          if (card.classList.contains('empty-slot')) {
            // Clicked an empty slot -> Save new game
            this.createConfirmationModal(
              _('save_current_game'),
              _('confirm_save_new'),
              () => {
              this.gameApi.saveCurrentGame();
              this.closeSaveGameModal();
            }
            );
          } else if (gameId) {
            // Clicked an existing game -> Confirm override
            this.createConfirmationModal(
              _('confirm_override_title'),
              _('confirm_override_save', { topic: card.querySelector('strong').textContent }),
              () => {
              this.gameApi.saveCurrentGame(gameId); // Pass gameId to override
              this.closeSaveGameModal();
            }
            );
          }
        });
      });

      modal.querySelectorAll('.btn-delete-game').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const gameId = btn.dataset.gameId;
          const _ = (k) => (window.t ? t(k) : k);
          if (gameId) {
            this.createConfirmationModal(
              _('confirm_delete_title'),
              _('confirm_delete_text'),
              () => {
                this.showMessageInModal(_('deleting_game'), 'info');
                fetch(`${window.API_BASE}/api/v1/saved-games/${gameId}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then(r => r.json().then(data => ({ ok: r.ok, data })))
                .then(({ ok, data }) => {
                  if (!ok) throw new Error(data.error || 'Failed to delete game.');
                  this.showMessageInModal(_('game_deleted_success'), 'success');
                  setTimeout(() => this.createSaveGameModal(), 1000); // Refresh modal
                })
                .catch(err => this.showMessageInModal(err.message, 'error'));
              }
            );
          }
        });
      });
    })
    .catch(err => {
      console.error(err);
      modal.querySelectorAll('.saved-game-card').forEach(card => card.innerHTML = `<div class="card-content">${_('error_loading_games')}</div>`);
    });
  }

  closeSaveGameModal() {
    const m = document.querySelector(".auth-modal");
    if (!m) return;
    m.classList.remove("show");
    setTimeout(() => m.remove(), 250);
  }

  createConfirmationModal(title, text, onConfirm) {
    // Close any existing save modal first
    this.closeSaveGameModal();

    const _ = (k) => (window.t ? t(k) : k);

    const modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.innerHTML = `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${title}</h2></div>
            <p class="text-center">${text}</p>
            <div class="form-actions">
                <button type="button" class="btn btn-primary" id="confirmActionYes">${_("yes")}</button>
                <button type="button" class="btn btn-secondary" id="confirmActionNo">${_("no")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);

    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 250);
    };

    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#confirmActionNo')?.addEventListener('click', () => {
      // Re-open the save game modal instead of closing completely
      closeModal();
      this.createSaveGameModal();
    });
    modal.querySelector('#confirmActionYes')?.addEventListener('click', () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });
  }

  showInfoModal(title, text) {
    const _ = (k) => (window.t ? t(k) : k);

    const modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.innerHTML = `
      <div class="auth-modal-content profile-modal">
        <button class="close-btn">&times;</button>
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${title}</h2></div>
            <p class="text-center">${text}</p>
            <div class="form-actions">
                <button type="button" class="btn btn-primary" id="infoModalOkBtn">${_("ok")}</button>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);

    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 250);
    };

    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#infoModalOkBtn')?.addEventListener('click', closeModal);
  }

  showProgressModal(title) {
    // Close any other modals first
    this.closeSaveGameModal();
    this.topicDifficulty.closeGameModal();

    const _ = (k) => (window.t ? t(k) : k);

    const modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.id = "progressModal"; // Add an ID for easy selection
    modal.innerHTML = `
      <div class="auth-modal-content profile-modal">
        <div class="auth-modal-body">
          <div class="auth-form-section">
            <div class="auth-form-header"><h2>${title}</h2></div>
            <p class="text-center" id="progressText"></p>
            <div class="progress-bar-container">
              <div class="progress-bar" id="progressBar"></div>
            </div>
          </div>
          <div class="auth-logo-section"><div class="logo-container"><img src="./assets/crossythink_logo.png" class="modal-logo"><h3>${_("brand_name")}</h3></div></div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("show"), 10);
  }

  updateProgressModal(text, percentage) {
    const progressTextEl = document.getElementById("progressText");
    const progressBarEl = document.getElementById("progressBar");

    if (progressTextEl) {
      progressTextEl.textContent = text;
    }
    if (progressBarEl) {
      progressBarEl.style.width = `${percentage}%`;
    }
  }

  closeProgressModal() {
    const modal = document.getElementById("progressModal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  showMessageInModal(msg, type = "info") {
    const content = document.getElementById("saveGameModalContent");
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

  onAuthChange() {
    // This method can be called from auth.js when the user logs in or out
    this.updateSaveGameButtonVisibility();
  }

  updateSaveGameButtonVisibility() {
    const isAuthenticated = this.isAuthenticated();
    const isGameActive = this.solutionGrid && this.solutionGrid.length > 0;
    document.querySelectorAll('.js-save-game-btn').forEach(btn => {
      // Hide the button if the user is not authenticated
      const wrapper = btn.closest('.tooltip-wrapper') || btn;
      // Show only if logged in AND a game is active
      wrapper.style.display =
        isAuthenticated && isGameActive ? "inline-flex" : "none";
    });
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
