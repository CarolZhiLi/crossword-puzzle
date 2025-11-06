// API calls and game data processing
import { GridUtils } from './gridUtils.js';

export class GameApi {
    constructor(gameInstance) {
        this.game = gameInstance;
    }

    startGame() {
        const topic = document.getElementById('topicSelect').value;
        const difficulty = document.getElementById('difficultySelect').value;
        
        console.log(`Starting new game with topic: ${topic}, difficulty: ${difficulty}`);
        
        // Reset game state
        this.game.currentWord = null;
        this.game.currentDirection = 'across';
        this.game.startTime = Date.now();
        
        // Clear any existing timer
        if (this.game.timerInterval) {
            clearInterval(this.game.timerInterval);
        }
        
        // Start new timer
        this.game.startTimer();
        
        // Frontend does not enforce daily limits; backend is the source of truth

        // Fetch and render new puzzle
        const diffMap = { 'Easy': 'easy', 'Medium': 'medium', 'Hard': 'hard'};
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
        }).then(r => r.json().then(data => ({ ok: r.ok, status: r.status, data }))).then(({ ok, status, data }) => {
            if (!ok) {
                if (status === 429 && data && data.daily) {
                    const msg = (window.t ? t('user_daily_limit') : 'Daily free limit reached.');
                    alert(msg);
                    return;
                }
                throw new Error(data && data.error ? data.error : 'Failed to generate puzzle');
            }

            const normalized = GridUtils.normalizeGrid(data.grid || []);
            this.game.solutionGrid = normalized.grid;
            this.game.gridSize = normalized.size || (this.game.solutionGrid ? this.game.solutionGrid.length : 0) || 15;
            this.game.words = {};
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
                this.game.words[num] = { word, start, direction: dir, length: item.length || word.length };
                num++;
            });
            console.info('Crossword loaded', {
                gridSize: this.game.gridSize,
                rows: this.game.solutionGrid.length,
                columns: this.game.solutionGrid[0] ? this.game.solutionGrid[0].length : 0,
                words: Object.keys(this.game.words).length
            });
        const defs = data.definitions || {};
        this.game.definitionsData = defs;
            const allCluesEl = document.getElementById('allClues');
            if (allCluesEl) {
                // Combine all clues and sort by number
                const allClues = Object.entries(this.game.words)
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
                    this.game.selectWord(wordNum);
                });
            });
            this.game.initializeGrid();
            // Count this successful start toward free-play limits
            try { this.game.markGameStartedSuccessfully(); } catch (_) {}
            // Refresh usage indicator (calls/tokens) for logged-in users
            try { if (typeof window.refreshUsageIndicator === 'function') window.refreshUsageIndicator(); } catch (_) {}
            // Ensure definitions list visible by default on start
            try { this.game.ensureDefinitionsVisible(); } catch (_) {}
            // Update header banner (daily limit info) instead of alert
            try { if (typeof window.refreshUsageIndicator === 'function') window.refreshUsageIndicator(); } catch (_) {}
        }).catch(err => {
            console.error(err);
            alert(err.message || t('error_generating_puzzle'));
        });
    }
}

