// Word selection and highlighting logic
export class WordSelector {
  constructor(gameInstance) {
    this.game = gameInstance;
  }

  getCellNumber(row, col) {
    // Return cell number if this is the start of a word
    for (const [num, word] of Object.entries(this.game.words)) {
      if (word.start[0] === row && word.start[1] === col) {
        return num;
      }
    }
    return null;
  }

  getWordAt(row, col) {
    for (const [num, word] of Object.entries(this.game.words)) {
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

  selectCell(row, col) {
    // Clear previous selections
    this.clearSelections();

    // Find which word this cell belongs to
    const wordInfo = this.getWordAt(row, col);
    if (wordInfo) {
      this.game.currentWord = wordInfo.number;
      this.game.currentDirection = wordInfo.direction;
      this.highlightWord(wordInfo.number, wordInfo.direction);
      this.highlightClue(wordInfo.number);
    }

    // Highlight the cell
    if (this.game.grid[row] && this.game.grid[row][col]) {
      this.game.grid[row][col].classList.add("active");
    }
  }

  selectWord(wordNum) {
    this.clearSelections();
    this.game.currentWord = wordNum;

    const word = this.game.words[wordNum];
    this.game.currentDirection = word.direction;

    this.highlightWord(wordNum, word.direction);
    this.highlightClue(wordNum);

    // Focus on first cell of the word
    const [startRow, startCol] = word.start;
    if (this.game.grid[startRow] && this.game.grid[startRow][startCol]) {
      const firstCell = this.game.grid[startRow][startCol];
      const input = firstCell.querySelector("input");
      if (input) {
        input.focus();
      }
    }
  }

  highlightWord(wordNum, direction) {
    const word = this.game.words[wordNum];
    const [startRow, startCol] = word.start;

    for (let i = 0; i < word.length; i++) {
      const row = direction === "across" ? startRow : startRow + i;
      const col = direction === "across" ? startCol + i : startCol;
      if (this.game.grid[row] && this.game.grid[row][col]) {
        this.game.grid[row][col].classList.add("highlighted");
      }
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
}

