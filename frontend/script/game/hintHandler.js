// Hint functionality management
import { t } from "../strings.js";

export class HintHandler {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  setupEventListeners() {
    // Single letter hint button
    document
      .getElementById("hintBtn")
      ?.addEventListener("click", () => this.showHint());

    // Hint word buttons - use class selector to handle all hint buttons at once
    document.querySelectorAll(".js-hint-word-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.hintWord());
    });
  }

  showHint() {
    if (!this.game.currentWord) {
      const msg = t("select_word_first");
      const title = t("select_word_first_title");
      this.game.showInfoModal(title, msg);
      return;
    }

    const wordData = this.game.words[this.game.currentWord];
    if (!wordData) {
      console.error(
        "Hint failed: Could not find data for current word:",
        this.game.currentWord
      );
      return;
    }

    const { word, start } = wordData;
    const [startRow, startCol] = start;

    // Reveal first letter as hint (use puzzle coordinates)
    const firstCell = this.game.getGridCell(startRow, startCol);
    if (firstCell) {
      const input = firstCell.querySelector("input");
      if (input && !input.value) {
        input.value = word[0];
        input.classList.add("hinted"); // Use a class instead of inline style
      }
    } else {
      console.error(
        `Hint failed: Attempted to access non-existent cell at [${startRow}, ${startCol}]`
      );
    }
  }

  hintWord() {
    if (!this.game.currentWord) {
      const msg = t("select_word_first");
      const title = t("select_word_first_title");
      this.game.showInfoModal(title, msg);
      return;
    }

    const wordData = this.game.words[this.game.currentWord];
    if (!wordData) {
      console.error(
        "Hint failed: Could not find data for current word:",
        this.game.currentWord
      );
      return;
    }

    const { word, start, direction, length } = wordData;
    const [startRow, startCol] = start;

    for (let i = 0; i < length; i++) {
      const row = direction === "across" ? startRow : startRow + i;
      const col = direction === "across" ? startCol + i : startCol;

      // Use puzzle coordinates to get grid cell
      const cell = this.game.getGridCell(row, col);
      if (cell) {
        const input = cell.querySelector("input");
        if (input) {
          input.value = word[i];
          input.classList.add("hinted"); // Use a class instead of inline style for better CSS management
        }
      } else {
        console.error(
          `Hint failed: Attempted to access non-existent cell at puzzle coords [${row}, ${col}]`
        );
      }
    }
  }

  applyI18n() {
    try {
      const hint = document.getElementById("hintWordBtn");
      if (hint) {
        if (hint.tagName === "IMG") {
          hint.alt = t("btn_hint");
        } else {
          hint.textContent = t("btn_hint");
        }
      }
    } catch (_) {
      // Silently fail if translation function is not available
    }
  }
}
