const API_BASE = 'http://localhost:5050';

export default class CrosswordGame {
    constructor() {
        this.currentWord = null;
        this.currentDirection = 'across';
        this.startTime = Date.now();
        this.timerInterval = null;
        this.gridSize = 15; 
        this.solutionGrid = [];
        this.grid = [];
        this.words = {};
        
        this.initializeGrid();
        this.setupEventListeners();
        this.startTimer();
        this.setupResponsiveGrid();
        this.applyI18nUI();
    }

    // ---- Free play gating helpers ----
    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    getCurrentUsername() {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            return u && u.username ? u.username : null;
        } catch (_) { return null; }
    }

    getTodayKey(prefix) {
        const d = new Date();
        const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const iso = day.toISOString().slice(0, 10);
        return `${prefix}_${iso}`;
    }

    canStartGame() {
        if (!this.isAuthenticated()) {
            const used = localStorage.getItem('guestPlayed') === 'true';
            if (used) {
                alert(t('guest_free_over'));
                // Open sign-in modal via header button
                document.getElementById('signInBtn')?.click();
                return false;
            }
            return true; // allow the one free play
        }

        const username = this.getCurrentUsername() || 'user';
        const key = this.getTodayKey(`plays_${username}`);
        const count = parseInt(localStorage.getItem(key) || '0', 10);
        if (count >= 3) {
            alert(t('user_daily_limit'));
            return false;
        }
        return true;
    }

    markGameStartedSuccessfully() {
        if (!this.isAuthenticated()) {
            // consume the one-time guest play after success
            localStorage.setItem('guestPlayed', 'true');
            return;
        }
        const username = this.getCurrentUsername() || 'user';
        const key = this.getTodayKey(`plays_${username}`);
        const count = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, String((isNaN(count) ? 0 : count) + 1));
    }

    normalizeGrid(grid) {
        if (!grid || !grid.length || !grid[0]) {
            return { grid: [], size: 0, offset: { row: 0, col: 0 } };
        }

        const isEmptyCell = (val) => {
            if (val === null || val === undefined) return true;
            if (typeof val === 'string') {
                return val.trim() === '';
            }
            return false;
        };

        const totalRows = grid.length;
        const totalCols = grid[0].length;

        const rowEmpty = (idx) => grid[idx].every(isEmptyCell);
        const colEmpty = (idx) => grid.every(row => isEmptyCell(row[idx]));

        let top = 0;
        let bottom = totalRows - 1;
        let left = 0;
        let right = totalCols - 1;

        while (top <= bottom && rowEmpty(top)) top++;
        while (bottom >= top && rowEmpty(bottom)) bottom--;
        while (left <= right && colEmpty(left)) left++;
        while (right >= left && colEmpty(right)) right--;

        if (top > bottom || left > right) {
            // No meaningful content; return a minimal 1x1 grid
            return {
                grid: [['']],
                size: 1,
                offset: { row: 0, col: 0 }
            };
        }

        const trimmed = [];
        for (let r = top; r <= bottom; r++) {
            trimmed.push(grid[r].slice(left, right + 1));
        }

        const basePadding = 1; // ensure at least one empty layer around the puzzle
        let padTop = basePadding;
        let padBottom = basePadding;
        let padLeft = basePadding;
        let padRight = basePadding;

        const trimmedRows = trimmed.length;
        const trimmedCols = trimmed[0].length;

        let paddedRows = trimmedRows + basePadding * 2;
        let paddedCols = trimmedCols + basePadding * 2;

        const targetSize = Math.max(paddedRows, paddedCols);
        if (paddedRows < targetSize) {
            const extraRows = targetSize - paddedRows;
            const addTop = Math.floor(extraRows / 2);
            const addBottom = extraRows - addTop;
            padTop += addTop;
            padBottom += addBottom;
            paddedRows = targetSize;
        }
        if (paddedCols < targetSize) {
            const extraCols = targetSize - paddedCols;
            const addLeft = Math.floor(extraCols / 2);
            const addRight = extraCols - addLeft;
            padLeft += addLeft;
            padRight += addRight;
            paddedCols = targetSize;
        }

        const normalized = Array.from({ length: paddedRows }, () => new Array(paddedCols).fill(''));
        for (let r = 0; r < trimmedRows; r++) {
            for (let c = 0; c < trimmedCols; c++) {
                normalized[r + padTop][c + padLeft] = trimmed[r][c];
            }
        }

        return {
            grid: normalized,
            size: targetSize,
            offset: {
                row: padTop - top,
                col: padLeft - left
            }
        };
    }

    initializeGrid() {
        const gridContainer = document.getElementById('crosswordGrid');
        gridContainer.innerHTML = '';

        // Use solution grid shape; if not loaded yet, skip rendering
        if (!this.solutionGrid || !this.solutionGrid.length) {
            this.grid = [];
            return;
        }

        // Set grid template based on current solution grid size
        this.gridSize = this.solutionGrid.length;
        
        // Set grid template based on current grid size
        gridContainer.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${this.gridSize}, 1fr)`;

        // Create grid
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add black cells for empty spaces
                if (!this.solutionGrid[row][col] || this.solutionGrid[row][col] === '') {
                    cell.classList.add('black');
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.addEventListener('input', (e) => this.handleInput(e, row, col));
                    input.addEventListener('keydown', (e) => this.handleKeyDown(e, row, col));
                    cell.appendChild(input);
                    
                    // Add cell numbers
                    const number = this.getCellNumber(row, col);
                    if (number) {
                        const numberSpan = document.createElement('span');
                        numberSpan.className = 'cell-number';
                        numberSpan.textContent = number;
                        cell.appendChild(numberSpan);
                    }
                }
                
                cell.addEventListener('click', () => this.selectCell(row, col));
                gridContainer.appendChild(cell);
                this.grid[row][col] = cell;
            }
        }

        this.adjustGridSize();
    }

    isBlackCell(row, col) {
        // Define black cells (empty spaces) in the grid
        const blackCells = [
            [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14],
            [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1, 12], [1, 13], [1, 14],
            [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [3, 11], [3, 12], [3, 13], [3, 14],
            [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13], [5, 14],
            [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [7, 9], [7, 10], [7, 11], [7, 12], [7, 13], [7, 14],
            [9, 0], [9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14],
            [11, 0], [11, 1], [11, 2], [11, 3], [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9], [11, 10], [11, 11], [11, 12], [11, 13], [11, 14],
            [13, 0], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5], [13, 6], [13, 7], [13, 8], [13, 9], [13, 10], [13, 11], [13, 12], [13, 13], [13, 14],
            [14, 0], [14, 1], [14, 2], [14, 3], [14, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [14, 11], [14, 12], [14, 13], [14, 14]
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
        this.grid[row][col].classList.add('active');
    }

    getWordAt(row, col) {
        for (const [num, word] of Object.entries(this.words)) {
            const [startRow, startCol] = word.start;
            if (word.direction === 'across') {
                if (row === startRow && col >= startCol && col < startCol + word.length) {
                    return { number: num, direction: 'across' };
                }
            } else {
                if (col === startCol && row >= startRow && row < startRow + word.length) {
                    return { number: num, direction: 'down' };
                }
            }
        }
        return null;
    }

    highlightWord(wordNum, direction) {
        const word = this.words[wordNum];
        const [startRow, startCol] = word.start;
        
        for (let i = 0; i < word.length; i++) {
            const row = direction === 'across' ? startRow : startRow + i;
            const col = direction === 'across' ? startCol + i : startCol;
            this.grid[row][col].classList.add('highlighted');
        }
    }

    highlightClue(wordNum) {
        // Remove active class from all clues
        document.querySelectorAll('.clue-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current clue
        const clueItem = document.querySelector(`[data-word="${wordNum}"]`);
        if (clueItem) {
            clueItem.classList.add('active');
        }
    }

    clearSelections() {
        // Clear all highlights
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('active', 'highlighted');
        });
        
        document.querySelectorAll('.clue-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    handleInput(event, row, col) {
        const value = event.target.value.toUpperCase();
        event.target.value = value;
        
        // Auto-advance to next cell
        if (value && this.currentWord) {
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
        if (!this.currentWord) return;
        
        const word = this.words[this.currentWord];
        const [startRow, startCol] = word.start;
        
        let nextRow = row;
        let nextCol = col;
        
        if (this.currentDirection === 'across') {
            nextCol = col + 1;
            if (nextCol >= startCol + word.length) return;
        } else {
            nextRow = row + 1;
            if (nextRow >= startRow + word.length) return;
        }
        
        const nextCell = this.grid[nextRow][nextCol];
        if (nextCell && !nextCell.classList.contains('black')) {
            const input = nextCell.querySelector('input');
            if (input) {
                input.focus();
            }
        }
    }

    moveToPreviousCell(row, col) {
        if (!this.currentWord) return;
        
        const word = this.words[this.currentWord];
        const [startRow, startCol] = word.start;
        
        let prevRow = row;
        let prevCol = col;
        
        if (this.currentDirection === 'across') {
            prevCol = col - 1;
            if (prevCol < startCol) return;
        } else {
            prevRow = row - 1;
            if (prevRow < startRow) return;
        }
        
        const prevCell = this.grid[prevRow][prevCol];
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

    setupEventListeners() {
        // Clue click handlers
        document.querySelectorAll('.clue-item').forEach(item => {
            item.addEventListener('click', () => {
                const wordNum = item.dataset.word;
                this.selectWord(wordNum);
            });
        });

        // Dropdown change handlers
        document.getElementById('topicSelect').addEventListener('change', (e) => {
            this.handleTopicChange(e.target.value);
        });
        
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.handleDifficultyChange(e.target.value);
        });

        // Start game button handler
        document.getElementById('startGameBtn')?.addEventListener('click', () => {
            this.startGame();
        });

        // Control button handlers
        document.getElementById('hintBtn')?.addEventListener('click', () => this.showHint());
        document.getElementById('checkPuzzleBtn')?.addEventListener('click', () => this.checkPuzzle());
        document.getElementById('hintWordBtn')?.addEventListener('click', () => this.hintWord());
        document.getElementById('checkWordBtn')?.addEventListener('click', () => this.checkWord());
        document.getElementById('newGameBtn')?.addEventListener('click', () => this.newGame());
        document.getElementById('restartBtn')?.addEventListener('click', () => this.restartGame());

        // Mobile button handlers
        document.getElementById('mobileHintBtn')?.addEventListener('click', () => this.hintWord());
        document.getElementById('mobileCheckBtn')?.addEventListener('click', () => this.checkWord());
        document.getElementById('mobileNewGameBtn')?.addEventListener('click', () => this.newGame());
        document.getElementById('mobileSignInBtn')?.addEventListener('click', () => {
            const signInBtn = document.getElementById('signInBtn');
            if (signInBtn) signInBtn.click();
        });

        // Clues panel toggle (mobile)
        const cluesToggleBtn = document.getElementById('cluesToggleBtn');
        const cluesPanel = document.getElementById('cluesPanel');
        const cluesCloseBtn = document.getElementById('cluesCloseBtn');
        const cluesBackdrop = document.getElementById('cluesBackdrop');
        
        const openCluesPanel = () => {
            if (cluesPanel) cluesPanel.classList.add('mobile-open');
            if (cluesBackdrop) cluesBackdrop.classList.add('active');
        };

        const closeCluesPanel = () => {
            if (cluesPanel) cluesPanel.classList.remove('mobile-open');
            if (cluesBackdrop) cluesBackdrop.classList.remove('active');
        };
        
        if (cluesToggleBtn) {
            cluesToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (cluesPanel && cluesPanel.classList.contains('mobile-open')) {
                    closeCluesPanel();
                } else {
                    openCluesPanel();
                }
            });
        }

        if (cluesCloseBtn) {
            cluesCloseBtn.addEventListener('click', closeCluesPanel);
        }

        if (cluesBackdrop) {
            cluesBackdrop.addEventListener('click', closeCluesPanel);
        }

        // Also close on window resize if switching to desktop view
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeCluesPanel();
            }
        });
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
        const input = firstCell.querySelector('input');
        if (input) {
            input.focus();
        }
    }

    showHint() {
        if (!this.currentWord) {
            alert(t('select_word_first'));
            return;
        }
        
        const word = this.words[this.currentWord];
        const [startRow, startCol] = word.start;
        
        // Reveal first letter as hint
        const firstCell = this.grid[startRow][startCol];
        const input = firstCell.querySelector('input');
        if (input && !input.value) {
            input.value = word.word[0];
            input.style.color = '#48bb78';
        }
    }

    hintWord() {
        if (!this.currentWord) {
            alert(t('select_word_first'));
            return;
        }
        
        const word = this.words[this.currentWord];
        const [startRow, startCol] = word.start;
        
        // Reveal the entire word
        for (let i = 0; i < word.length; i++) {
            const row = this.currentDirection === 'across' ? startRow : startRow + i;
            const col = this.currentDirection === 'across' ? startCol + i : startCol;
            const cell = this.grid[row][col];
            const input = cell.querySelector('input');
            if (input) {
                input.value = word.word[i];
                input.style.color = '#48bb78';
            }
        }
    }

    checkWord() {
        if (!this.currentWord) {
            alert(t('select_word_first'));
            return;
        }
        
        const word = this.words[this.currentWord];
        const [startRow, startCol] = word.start;
        let userWord = '';
        
        for (let i = 0; i < word.length; i++) {
            const row = this.currentDirection === 'across' ? startRow : startRow + i;
            const col = this.currentDirection === 'across' ? startCol + i : startCol;
            const cell = this.grid[row][col];
            const input = cell.querySelector('input');
            userWord += input ? input.value : '';
        }
        
        if (userWord === word.word) {
            alert(t('correct'));
            // Highlight correct word
            for (let i = 0; i < word.length; i++) {
                const row = this.currentDirection === 'across' ? startRow : startRow + i;
                const col = this.currentDirection === 'across' ? startCol + i : startCol;
                const cell = this.grid[row][col];
                cell.style.background = '#c6f6d5';
            }
        } else {
            alert(t('incorrect'));
        }
    }

    checkPuzzle() {
        let correctWords = 0;
        let totalWords = Object.keys(this.words).length;
        
        for (const [wordNum, word] of Object.entries(this.words)) {
            const [startRow, startCol] = word.start;
            let userWord = '';
            
            for (let i = 0; i < word.length; i++) {
                const row = word.direction === 'across' ? startRow : startRow + i;
                const col = word.direction === 'across' ? startCol + i : startCol;
                const cell = this.grid[row][col];
                const input = cell.querySelector('input');
                userWord += input ? input.value : '';
            }
            
            if (userWord === word.word) {
                correctWords++;
            }
        }
        
        const percentage = Math.round((correctWords / totalWords) * 100);
        alert(t('puzzle_progress', { correct: correctWords, total: totalWords, percent: percentage }));
        
        if (correctWords === totalWords) {
            alert(t('puzzle_solved'));
            this.stopTimer();
        }
    }

    newGame() {
        // Check if user is authenticated
        if (!this.isAuthenticated()) {
            // Guest user - show login modal
            const signInBtn = document.getElementById('signInBtn');
            if (signInBtn) {
                signInBtn.click();
            }
            return;
        }
        
        // Registered user - show game controls modal
        this.showGameControlsModal();
    }

    showGameControlsModal() {
        // Remove existing modal if any
        const existingModal = document.querySelector('.game-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'game-modal';
        modal.innerHTML = `
            <div class="game-modal-content">
                <button class="game-modal-close">&times;</button>
                <div class="game-modal-header">
                    <h2>${t('new_game') || 'New Game'}</h2>
                </div>
                <div class="game-settings">
                    <select id="modalTopicSelect" class="dropdown">
                        <option value="JavaScript">${t('topic_js') || 'JavaScript'}</option>
                        <option value="Science">${t('topic_science') || 'Science'}</option>
                        <option value="History">${t('topic_history') || 'History'}</option>
                        <option value="Animals">${t('topic_animals') || 'Animals'}</option>
                        <option value="General">${t('topic_custom') || 'Customize'}</option>
                    </select>
                    <select id="modalDifficultySelect" class="dropdown">
                        <option value="Easy">${t('diff_easy') || 'Easy'}</option>
                        <option value="Medium">${t('diff_medium') || 'Medium'}</option>
                        <option value="Hard">${t('diff_hard') || 'Hard'}</option>
                    </select>
                    <button class="btn btn-primary" id="modalStartGameBtn">${t('btn_start_game') || 'Start Game'}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Sync dropdowns with current values
        const topicSelect = document.getElementById('topicSelect');
        const difficultySelect = document.getElementById('difficultySelect');
        const modalTopicSelect = document.getElementById('modalTopicSelect');
        const modalDifficultySelect = document.getElementById('modalDifficultySelect');
        
        if (topicSelect && modalTopicSelect) {
            modalTopicSelect.value = topicSelect.value;
        }
        if (difficultySelect && modalDifficultySelect) {
            modalDifficultySelect.value = difficultySelect.value;
        }
        
        // Add event listeners
        modal.querySelector('.game-modal-close').addEventListener('click', () => {
            this.closeGameModal();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('game-modal')) {
                this.closeGameModal();
            }
        });
        
        document.getElementById('modalStartGameBtn').addEventListener('click', () => {
            // Sync values to main dropdowns
            if (topicSelect && modalTopicSelect) {
                topicSelect.value = modalTopicSelect.value;
            }
            if (difficultySelect && modalDifficultySelect) {
                difficultySelect.value = modalDifficultySelect.value;
            }
            
            this.closeGameModal();
            this.startGame();
        });
        
        // Add animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    closeGameModal() {
        const modal = document.querySelector('.game-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }

    restartGame() {
        if (confirm(t('confirm_restart'))) {
            // Clear all inputs
            document.querySelectorAll('.grid-cell input').forEach(input => {
                input.value = '';
                input.style.color = '#2d3748';
            });
            
            // Clear selections
            this.clearSelections();
            
            // Reset timer
            this.startTime = Date.now();
            this.updateTimer();
        }
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
        const el = document.getElementById('timer');
        if (el) {
            el.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    handleTopicChange(topic) {
        console.log('Topic changed to:', topic);
        // Here you would typically generate a new puzzle based on the topic
        // For now, we'll just show a message
        alert(t('topic_changed', { topic }));
    }

    handleDifficultyChange(difficulty) {
        console.log('Difficulty changed to:', difficulty);
        
        // Adjust grid size based on difficulty
        let newGridSize;
        switch(difficulty) {
            case 'Easy':
                newGridSize = 10;
                break;
            case 'Medium':
                newGridSize = 12;
                break;
            case 'Hard':
                newGridSize = 15;
                break;
            case 'Expert':
                newGridSize = 18;
                break;
            default:
                newGridSize = 15;
        }
        
        if (newGridSize !== this.gridSize) {
            this.gridSize = newGridSize;
            this.initializeGrid();
            alert(t('grid_size_changed', { size: newGridSize, difficulty }));
        }
    }

    startGame() {
        const topic = document.getElementById('topicSelect').value;
        const difficulty = document.getElementById('difficultySelect').value;
        
        console.log(`Starting new game with topic: ${topic}, difficulty: ${difficulty}`);
        
        // Reset game state
        this.currentWord = null;
        this.currentDirection = 'across';
        this.startTime = Date.now();
        
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Start new timer
        this.startTimer();
        
        // Enforce free-play limits before generating a new puzzle
        if (!this.canStartGame()) {
            return;
        }
        // Immediately consume the guest free play to prevent multiple attempts
        try {
            if (!this.isAuthenticated() && localStorage.getItem('guestPlayed') !== 'true') {
                localStorage.setItem('guestPlayed', 'true');
            }
        } catch (_) {}

        // Fetch and render new puzzle
        const diffMap = { 'Easy': 'easy', 'Medium': 'medium', 'Hard': 'hard', 'Expert': 'hard' };
        const mapped = diffMap[difficulty] || 'easy';
            const headers = { 'Content-Type': 'application/json' };
            try {
                const token = localStorage.getItem('token');
                if (token) headers['Authorization'] = `Bearer ${token}`;
            } catch (_) {}
            fetch(`${window.API_BASE}/api/generate-crossword`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ topic, difficulty: mapped })
        }).then(r => r.json().then(data => ({ ok: r.ok, data }))).then(({ ok, data }) => {
            if (!ok || !data.success) throw new Error(data.error || 'Failed to generate puzzle');

            const normalized = this.normalizeGrid(data.grid || []);
            this.solutionGrid = normalized.grid;
            this.gridSize = normalized.size || (this.solutionGrid ? this.solutionGrid.length : 0) || 15;
            this.words = {};
            const rowOffset = normalized.offset?.row ?? 0;
            const colOffset = normalized.offset?.col ?? 0;

            let num = 1;
            (data.words || []).forEach(item => {
                const d = (item.direction || '').toString().toLowerCase();
                const dir = (d === 'h' || d === 'horizontal' || d === 'across') ? 'across' : 'down';
                const startRow = (item.row ?? 0) + rowOffset;
                const startCol = (item.col ?? 0) + colOffset;
                const start = [startRow, startCol];
                const word = (item.word || '').toUpperCase();
                this.words[num] = { word, start, direction: dir, length: item.length || word.length };
                num++;
            });
            console.info('Crossword loaded', {
                gridSize: this.gridSize,
                rows: this.solutionGrid.length,
                columns: this.solutionGrid[0] ? this.solutionGrid[0].length : 0,
                words: Object.keys(this.words).length
            });
            const defs = data.definitions || {};
            const allCluesEl = document.getElementById('allClues');
            if (allCluesEl) {
                // Combine all clues and sort by number
                const allClues = Object.entries(this.words)
                    .map(([n, w]) => ({
                        number: parseInt(n, 10),
                        word: n,
                        text: defs[w.word] || ''
                    }))
                    .sort((a, b) => a.number - b.number)
                    .map(item => `<div class="clue-item" data-word="${item.word}"><span class="clue-number">${item.word}.</span><span class="clue-text">${item.text}</span></div>`)
                    .join('');
                allCluesEl.innerHTML = allClues;
            }
            document.querySelectorAll('.clue-item').forEach(item => {
                item.addEventListener('click', () => {
                    const wordNum = item.dataset.word;
                    this.selectWord(wordNum);
                });
            });
            this.initializeGrid();
            // Count this successful start toward free-play limits
            try { this.markGameStartedSuccessfully(); } catch (_) {}
        }).catch(err => {
            console.error(err);
            alert(err.message || t('error_generating_puzzle'));
        });
    }

    setupResponsiveGrid() {
        // Handle window resize to maintain grid responsiveness
        window.addEventListener('resize', () => {
            this.adjustGridSize();
        });
        
        // Initial adjustment
        this.adjustGridSize();
    }

    adjustGridSize() {
        const gridContainer = document.getElementById('crosswordGrid');
        if (!gridContainer || !this.gridSize) {
            return;
        }

        const parent = gridContainer.parentElement;
        if (!parent) {
            return;
        }

        const headerBar = document.querySelector('.header-bar');
        const controlsBar = document.querySelector('.controls-bar');
        const topControls = document.querySelector('.game-controls');

        const windowHeight = window.innerHeight;
        const headerHeight = headerBar ? headerBar.offsetHeight : 0;
        const controlsHeight = controlsBar ? controlsBar.offsetHeight : 0;
        const topControlsHeight = topControls ? topControls.offsetHeight : 0;
        let topControlsGap = 0;
        if (topControls) {
            const styles = window.getComputedStyle(topControls);
            topControlsGap =
                parseFloat(styles.marginTop || '0') +
                parseFloat(styles.marginBottom || '0');
        }
        const verticalPadding = 40; // breathing room so the grid never touches edges
        const availableHeight = Math.max(
            0,
            windowHeight - headerHeight - controlsHeight - topControlsHeight - topControlsGap - verticalPadding
        );

        const availableWidth = Math.max(0, parent.clientWidth - 20);
        const maxDimension = Math.min(availableWidth, availableHeight);

        const attempts = Number(gridContainer.dataset.resizeAttempts || 0);
        if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
            if (attempts < 5) {
                gridContainer.dataset.resizeAttempts = attempts + 1;
                requestAnimationFrame(() => this.adjustGridSize());
            } else {
                delete gridContainer.dataset.resizeAttempts;
            }
            return;
        }

        delete gridContainer.dataset.resizeAttempts;

        gridContainer.style.width = `${maxDimension}px`;
        gridContainer.style.height = `${maxDimension}px`;
        gridContainer.style.maxWidth = `${maxDimension}px`;
        gridContainer.style.maxHeight = `${maxDimension}px`;
        gridContainer.style.margin = '0 auto';

        const cellSize = maxDimension / this.gridSize;
        if (Number.isFinite(cellSize) && cellSize > 0) {
            gridContainer.style.setProperty('--cell-size', `${cellSize}px`);
        } else {
            gridContainer.style.removeProperty('--cell-size');
        }
        console.debug('Crossword sizing', {
            containerWidth: parent.clientWidth,
            availableHeight,
            gridDimension: maxDimension,
            gridSize: this.gridSize,
            cellSize
        });
    }

    applyI18nUI() {
        try {
            const start = document.getElementById('startGameBtn');
            if (start) start.textContent = t('btn_start_game');
            const hint = document.getElementById('hintWordBtn');
            if (hint) hint.textContent = t('btn_hint');
            const check = document.getElementById('checkWordBtn');
            if (check) check.textContent = t('btn_check_puzzle');
            const newBtn = document.getElementById('newGameBtn');
            if (newBtn) newBtn.textContent = t('btn_new_game');

            // Clues titles removed - all clues shown in number order

            const topic = document.getElementById('topicSelect');
            if (topic && topic.options && topic.options.length >= 5) {
                topic.options[0].text = t('topic_js');
                topic.options[1].text = t('topic_science');
                topic.options[2].text = t('topic_history');
                topic.options[3].text = t('topic_animals');
                topic.options[4].text = t('topic_custom');
            }

            const diff = document.getElementById('difficultySelect');
            if (diff && diff.options && diff.options.length >= 4) {
                diff.options[0].text = t('diff_easy');
                diff.options[1].text = t('diff_medium');
                diff.options[2].text = t('diff_hard');
            }
        } catch (_) {}
    }
}

// (moved to module entry)

