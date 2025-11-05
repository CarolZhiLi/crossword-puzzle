// Input handling and keyboard navigation
export class InputHandler {
    constructor(gameInstance) {
        this.game = gameInstance;
    }

    handleInput(event, row, col) {
        const value = event.target.value.toUpperCase();
        event.target.value = value;
        
        // Auto-advance to next cell
        if (value && this.game.currentWord) {
            this.moveToNextCell(row, col);
        }
    }

    handleKeyDown(event, row, col) {
        if (event.key === 'Backspace' && !event.target.value) {
            this.moveToPreviousCell(row, col);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || 
                  event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            this.handleArrowKeys(event.key, row, col);
        }
    }

    moveToNextCell(row, col) {
        if (!this.game.currentWord) return;
        
        const word = this.game.words[this.game.currentWord];
        const [startRow, startCol] = word.start;
        
        let nextRow = row;
        let nextCol = col;
        
        if (this.game.currentDirection === 'across') {
            nextCol = col + 1;
            if (nextCol >= startCol + word.length) return;
        } else {
            nextRow = row + 1;
            if (nextRow >= startRow + word.length) return;
        }
        
        const nextCell = this.game.grid[nextRow][nextCol];
        if (nextCell && !nextCell.classList.contains('black')) {
            const input = nextCell.querySelector('input');
            if (input) {
                input.focus();
            }
        }
    }

    moveToPreviousCell(row, col) {
        if (!this.game.currentWord) return;
        
        const word = this.game.words[this.game.currentWord];
        const [startRow, startCol] = word.start;
        
        let prevRow = row;
        let prevCol = col;
        
        if (this.game.currentDirection === 'across') {
            prevCol = col - 1;
            if (prevCol < startCol) return;
        } else {
            prevRow = row - 1;
            if (prevRow < startRow) return;
        }
        
        const prevCell = this.game.grid[prevRow][prevCol];
        if (prevCell && !prevCell.classList.contains('black')) {
            const input = prevCell.querySelector('input');
            if (input) {
                input.focus();
            }
        }
    }

    handleArrowKeys(key, row, col) {
        // Toggle direction or move to next/previous word
        if (key === 'ArrowRight' || key === 'ArrowDown') {
            this.moveToNextCell(row, col);
        } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
            this.moveToPreviousCell(row, col);
        }
    }
}


