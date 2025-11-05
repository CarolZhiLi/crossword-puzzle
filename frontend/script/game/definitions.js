// Definitions overlay and popup management
export class Definitions {
    constructor(gameInstance) {
        this.game = gameInstance;
    }

    showDefinitionPopup(wordNum, anchorEl) {
        try {
            const info = this.game.words && this.game.words[wordNum];
            if (!info) return;
            const defMap = this.game.definitionsData || {};
            const defText = defMap[info.word] || '';

            let popup = document.getElementById('defPopup');
            if (!popup) {
                popup = document.createElement('div');
                popup.id = 'defPopup';
                popup.className = 'def-popup';
                const num = document.createElement('span');
                num.className = 'num';
                const text = document.createElement('span');
                text.className = 'text';
                popup.appendChild(num);
                popup.appendChild(text);
                document.body.appendChild(popup);
            }
            popup.querySelector('.num').textContent = `${wordNum}.`;
            popup.querySelector('.text').textContent = ` ${defText}`;

            const rect = anchorEl.getBoundingClientRect();
            const pad = 8;
            let top = rect.bottom + pad;
            let left = rect.left;
            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;

            popup.style.visibility = 'hidden';
            popup.style.display = 'block';
            const pw = popup.offsetWidth;
            const ph = popup.offsetHeight;
            if (left + pw + pad > vw) left = Math.max(pad, vw - pw - pad);
            if (top + ph + pad > vh) top = Math.max(pad, rect.top - ph - pad);
            popup.style.left = `${left}px`;
            popup.style.top = `${top}px`;
            popup.style.visibility = 'visible';

            const close = (e) => {
                const target = e.target;
                if (!popup.contains(target)) {
                    try { popup.remove(); } catch (_) {}
                    document.removeEventListener('click', close, true);
                }
            };
            setTimeout(() => document.addEventListener('click', close, true), 0);
        } catch (_) {}
    }

    renderDefinitionsOverlay() {
        const list = document.getElementById('defsOverlayList');
        if (!list || !this.game.words || !this.game.definitionsData) return;
        const items = Object.entries(this.game.words)
            .map(([n, w]) => ({ number: parseInt(n,10), word: w.word, def: this.game.definitionsData[w.word] || '' }))
            .sort((a,b)=>a.number-b.number);
        list.innerHTML = items.map(item => {
            const safeWord = (item.word || '').toString();
            const safeDef = (item.def || '').toString();
            return `<div class="defs-item"><span class="defs-word">${item.number}. ${safeWord}</span><span class="defs-text">${safeDef}</span></div>`;
        }).join('');
    }

    openDefinitionsOverlay() {
        const overlay = document.getElementById('defsOverlay');
        if (!overlay) return;
        if (!this.game.definitionsData || !this.game.words) {
            try { this.renderDefinitionsOverlay(); } catch(_) {}
        }
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeDefinitionsOverlay() {
        const overlay = document.getElementById('defsOverlay');
        if (!overlay) return;
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    }

    toggleDefinitions() {
        const area = document.querySelector('.game-area');
        if (!area) return;
        // Desktop only: toggle defs-collapsed class
        if (window.innerWidth > 1024) {
            area.classList.toggle('defs-collapsed');
            return;
        }
        // iPad and Mobile: use overlay panel (never in layout)
        const panel = document.getElementById('cluesPanel');
        const backdrop = document.getElementById('cluesBackdrop');
        if (!panel || !backdrop) return;
        if (panel.classList.contains('mobile-open')) {
            panel.classList.remove('mobile-open');
            backdrop.classList.remove('active');
        } else {
            // Sync height with grid before opening
            this.game.gridSizing.syncPanelHeightWithGrid();
            panel.classList.add('mobile-open');
            backdrop.classList.add('active');
        }
    }

    ensureDefinitionsVisible() {
        const area = document.querySelector('.game-area');
        if (area && area.classList.contains('defs-collapsed')) {
            area.classList.remove('defs-collapsed');
        }
        const panel = document.getElementById('cluesPanel');
        const backdrop = document.getElementById('cluesBackdrop');
        if (window.innerWidth <= 768) {
            if (panel) panel.classList.add('mobile-open');
            if (backdrop) backdrop.classList.add('active');
        } else {
            if (panel) panel.classList.remove('mobile-open');
            if (backdrop) backdrop.classList.remove('active');
        }
    }
}

