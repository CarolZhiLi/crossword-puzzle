// API calls and game data processing
import { GridUtils } from "./gridUtils.js";
import { t } from "../strings.js";

export class GameApi {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  startGame() {
    // Keep video visible until grid is ready - don't hide it here
    // Video will be hidden in initializeGrid() when grid is actually created

    // Get topic and difficulty from TopicDifficulty helper
    let topic = this.game.topicDifficulty.getCurrentTopic();
    const difficulty = this.game.topicDifficulty.getCurrentDifficulty();
    
    // Handle custom topic
    if (topic === "General" && this.game.customTopic) {
      topic = this.game.customTopic;
    }

    console.log(
      `Starting new game with topic: ${topic}, difficulty: ${difficulty}`
    );

    // Reset game state
    this.game.currentWord = null;
    this.game.currentDirection = "across";
    
    // Clear previous grid data to show video
    this.game.solutionGrid = [];
    this.game.grid = [];
    this.game.words = {};
    
    // Hide any existing grid and show video
    const gridContainer = document.getElementById("crosswordGrid");
    if (gridContainer) {
      gridContainer.style.display = "none";
      gridContainer.innerHTML = "";
    }
    this.game.videoHandler.showAnimationVideo();

    // Stop and reset timer to 00:00 (but don't start yet - wait for grid to be displayed)
    this.game.timerHandler.stopTimer();
    // Reset start time and display 00:00
    this.game.timerHandler.resetTimer();

    // Frontend does not enforce daily limits; backend is the source of truth

    // Fetch and render new puzzle
    const diffMap = { Easy: "easy", Medium: "medium", Hard: "hard" };
    const mapped = diffMap[difficulty] || "easy";
    const headers = { "Content-Type": "application/json" };
    try {
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch (_) {}
    fetch(`${window.API_BASE}/api/generate-crossword`, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic, difficulty: mapped }),
    })
      .then((r) => {
        // Handle non-JSON responses
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return r
            .json()
            .then((data) => ({ ok: r.ok, status: r.status, data }));
        } else {
          // If response is not JSON, return error
          return {
            ok: false,
            status: r.status,
            data: { error: `Server error (${r.status})` },
          };
        }
      })
      .then(({ ok, status, data }) => {
        if (!ok) {
          if (status === 429 && data && data.daily) {
            const msg = t("user_daily_limit");
            alert(msg);
            return;
          }
          // Handle 502 specifically (word generation failed)
          if (status === 502) {
            const errorMsg =
              data && data.error ? data.error : "Word generation failed";
            throw new Error(
              `${errorMsg}. The server could not generate words for this topic. Please try a different topic or try again later.`
            );
          }
          // Handle 500 (crossword generation failed)
          if (status === 500) {
            const errorMsg =
              data && data.error ? data.error : "Crossword generation failed";
            throw new Error(
              `${errorMsg}. Please try again with a different topic or difficulty.`
            );
          }
          // Generic error
          throw new Error(
            data && data.error
              ? data.error
              : `Failed to generate puzzle (${status})`
          );
        }

        console.log("API response received, data:", data);
        const normalized = GridUtils.normalizeGrid(data.grid || []);
        console.log("Normalized grid:", normalized);
        this.game.solutionGrid = normalized.grid;
        this.game.gridSize =
          normalized.size ||
          (this.game.solutionGrid ? this.game.solutionGrid.length : 0) ||
          15;
        console.log(
          "Solution grid set, size:",
          this.game.gridSize,
          "rows:",
          this.game.solutionGrid.length
        );
        this.game.words = {};
        const rowOffset = normalized.offset?.row ?? 0;
        const colOffset = normalized.offset?.col ?? 0;

        let num = 1;
        (data.words || []).forEach((item) => {
          const d = (item.direction || "").toString().toLowerCase();
          const dir =
            d === "h" || d === "horizontal" || d === "across"
              ? "across"
              : "down";
          const startRow = (item.row ?? 0) + rowOffset;
          const startCol = (item.col ?? 0) + colOffset;
          const start = [startRow, startCol];
          const word = (item.word || "").toUpperCase();
          this.game.words[num] = {
            word,
            start,
            direction: dir,
            length: item.length || word.length,
          };
          num++;
        });
        console.info("Crossword loaded", {
          gridSize: this.game.gridSize,
          rows: this.game.solutionGrid.length,
          columns: this.game.solutionGrid[0]
            ? this.game.solutionGrid[0].length
            : 0,
          words: Object.keys(this.game.words).length,
        });
        const defs = data.definitions || {};
        this.game.definitionsData = defs;
        const allCluesEl = document.getElementById("allClues");
        const tabletClueContent = document.getElementById("tabletClueContent");
        if (allCluesEl) {
          // Combine all clues and sort by number
          const allClues = Object.entries(this.game.words)
            .map(([n, w]) => ({
              number: parseInt(n, 10),
              word: n,
              text: defs[w.word] || "",
            }))
            .sort((a, b) => a.number - b.number)
            .map(
              (item) =>
                `<div class="clue-item" data-word="${item.word}"><span class="clue-number">${item.word}.</span><span class="clue-text">${item.text}</span></div>`
            )
            .join("");
          allCluesEl.innerHTML = allClues;

          // Also populate tablet clue panel content
          if (tabletClueContent) {
            tabletClueContent.innerHTML = allClues;
          }
        }
        // Add event listeners to all clue items (both desktop and tablet)
        document.querySelectorAll(".clue-item").forEach((item) => {
          item.addEventListener("click", () => {
            const wordNum = item.dataset.word;
            this.game.wordSelector.selectWord(wordNum);
          });
        });
        // Initialize grid (video is already showing from startGame, will be hidden when grid is ready)
        this.game.initializeGrid();

        // Start timer only after grid is displayed and rendered
        // Use requestAnimationFrame to ensure grid is visible before starting timer
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Reset start time right before starting timer
            this.game.timerHandler.resetTimer();
            this.game.timerHandler.startTimer();
          });
        });

        // Count this successful start toward free-play limits
        try {
          this.game.markGameStartedSuccessfully();
        } catch (_) {}
        // Refresh usage indicator (calls/tokens) for logged-in users
        try {
          if (typeof window.refreshUsageIndicator === "function")
            window.refreshUsageIndicator();
        } catch (_) {}
        // Ensure definitions list visible by default on start
        try {
          this.game.definitions.ensureDefinitionsVisible();
        } catch (_) {}
        // Update header banner (daily limit info) instead of alert
        try {
          if (typeof window.refreshUsageIndicator === "function")
            window.refreshUsageIndicator();
        } catch (_) {}
      })
      .catch((err) => {
        console.error("Error generating crossword:", err);
        // Close the modal if it's open
        try {
          if (this.game && this.game.topicDifficulty && typeof this.game.topicDifficulty.closeGameModal === "function") {
            this.game.topicDifficulty.closeGameModal();
          }
        } catch (e) {
          console.warn("Could not close modal:", e);
        }
        // Show user-friendly error message
        const errorMsg =
          err.message || t("error_generating_puzzle");
        alert(errorMsg);
      });
  }
}
