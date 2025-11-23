// Puzzle checking and validation logic
import { t } from "../strings.js";

export class PuzzleChecker {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  setupEventListeners() {
    // All check/submit puzzle buttons - use class selector to handle all buttons at once
    document.querySelectorAll(".js-check-puzzle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        console.log("Check/Submit button clicked");
        this.checkPuzzle();
      });
    });
  }

  checkPuzzle() {
    console.log("checkPuzzle() called");

    // Validate that we have words and grid
    if (!this.game.words || Object.keys(this.game.words).length === 0) {
      console.error("No words found in puzzle");
      alert("Error: No puzzle loaded. Please start a new game.");
      return;
    }

    if (!this.game.grid || !this.game.grid.length) {
      console.error("Grid not initialized");
      alert("Error: Grid not initialized. Please start a new game.");
      return;
    }

    // Check if puzzle is complete (all cells filled)
    let incompleteWords = [];

    // First, check if all cells are filled
    for (const [wordNum, word] of Object.entries(this.game.words)) {
      if (!word || !word.start) {
        console.warn(`Invalid word data for word ${wordNum}:`, word);
        continue;
      }

      const [startRow, startCol] = word.start;
      let wordComplete = true;

      for (let i = 0; i < word.length; i++) {
        const row = word.direction === "across" ? startRow : startRow + i;
        const col = word.direction === "across" ? startCol + i : startCol;

        // Use puzzle coordinates to get grid cell
        const cell = this.game.getGridCell(row, col);
        if (!cell) {
          console.error(
            `Cell not found at puzzle coords [${row}][${col}] for word ${wordNum}`
          );
          wordComplete = false;
          continue;
        }

        const input = cell ? cell.querySelector("input") : null;
        const value = input ? input.value.trim() : "";

        if (!value) {
          wordComplete = false;
        }
      }

      if (!wordComplete) {
        incompleteWords.push(wordNum);
      }
    }

    // If puzzle is not complete, show message
    if (incompleteWords.length > 0) {
      const msg = t("puzzle_incomplete");
      const title = t("puzzle_incomplete_title");
      this.game.showInfoModal(title, msg);
      return;
    }

    // Puzzle is complete, now check answers
    let correctWords = 0;
    let totalWords = Object.keys(this.game.words).length;
    const incorrectWords = [];

    console.log(`Checking ${totalWords} words...`);

    for (const [wordNum, word] of Object.entries(this.game.words)) {
      if (!word || !word.start || !word.word) {
        console.warn(`Invalid word data for word ${wordNum}:`, word);
        continue;
      }

      const [startRow, startCol] = word.start;
      let userWord = "";

      for (let i = 0; i < word.length; i++) {
        const row = word.direction === "across" ? startRow : startRow + i;
        const col = word.direction === "across" ? startCol + i : startCol;

        // Use puzzle coordinates to get grid cell
        const cell = this.game.getGridCell(row, col);
        if (!cell) {
          console.error(
            `Cell not found at puzzle coords [${row}][${col}] for word ${wordNum}`
          );
          continue;
        }

        const input = cell ? cell.querySelector("input") : null;
        const value = input ? input.value.trim().toUpperCase() : "";
        userWord += value;
      }

      if (userWord === word.word) {
        correctWords++;
        // Highlight correct words in green
        for (let i = 0; i < word.length; i++) {
          const row = word.direction === "across" ? startRow : startRow + i;
          const col = word.direction === "across" ? startCol + i : startCol;

          const cell = this.game.getGridCell(row, col);
          if (cell) {
            cell.classList.add("correct");
            cell.classList.remove("incorrect");
          }
        }
      } else {
        incorrectWords.push(wordNum);
        // Highlight incorrect words in red
        for (let i = 0; i < word.length; i++) {
          const row = word.direction === "across" ? startRow : startRow + i;
          const col = word.direction === "across" ? startCol + i : startCol;

          const cell = this.game.getGridCell(row, col);
          if (cell) {
            cell.classList.add("incorrect");
            cell.classList.remove("correct");
          }
        }
      }
    }

    console.log(`Results: ${correctWords}/${totalWords} correct`);

    // Show results
    if (correctWords === totalWords) {
      // Puzzle is completely correct
      const msg = t("puzzle_solved");
      this.game.showInfoModal(msg, ""); // Title only for this one
      this.game.timerHandler.stopTimer();
    } else {
      // Some words are incorrect
      const msg = t("puzzle_results");
      const title = t("puzzle_results_title");
      this.game.showInfoModal(title, msg);
    }
  }

  applyI18n() {
    // Update all check/submit puzzle buttons using class selector
    const buttonText = t("btn_check_puzzle");
    const tooltipText = t("tooltip_check_puzzle");
    document.querySelectorAll(".js-check-puzzle-btn").forEach((check) => {
      if (check.tagName === "IMG") {
        check.alt = buttonText;
        check.title = tooltipText; // For mobile/tablet hover
        const wrapper = check.closest(".tooltip-wrapper");
        if (wrapper) wrapper.setAttribute("data-tooltip", tooltipText); // For desktop hover
      } else {
        check.textContent = buttonText;
      }
    });
  }
}
