// Responsive grid sizing and layout management
export class GridSizing {
    constructor(gameInstance) {
        this.game = gameInstance;
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
        if (!gridContainer || !this.game.gridSize) {
            return;
        }

        const parent = gridContainer.parentElement;
        if (!parent) {
            return;
        }

        const headerBar = document.querySelector('.header-bar');
        const controlsBar = document.querySelector('.controls-bar');
        const topControls = document.querySelector('.game-controls');
        const gameArea = document.querySelector('.game-area');

        const windowHeight = window.innerHeight;
        const headerHeight = headerBar ? headerBar.getBoundingClientRect().height : 0;
        const controlsHeight = controlsBar ? controlsBar.getBoundingClientRect().height : 0;
        const topControlsHeight = topControls ? topControls.offsetHeight : 0;
        let topControlsGap = 0;
        if (topControls) {
            const styles = window.getComputedStyle(topControls);
            topControlsGap =
                parseFloat(styles.marginTop || '0') +
                parseFloat(styles.marginBottom || '0');
        }
        
        // For desktop: use the actual game-area height (calculated by flexbox)
        let availableHeight;
        if (window.innerWidth >= 1025 && gameArea) {
            // Desktop: use actual game-area height
            availableHeight = gameArea.getBoundingClientRect().height;
        } else {
            // Mobile/iPad: calculate from window height
            const verticalPadding = 40; // breathing room so the grid never touches edges
            availableHeight = Math.max(
                0,
                windowHeight - headerHeight - controlsHeight - topControlsHeight - topControlsGap - verticalPadding
            );
        }

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

        // For desktop: set grid size to fit available space
        // Calculate available space accounting for grid's internal padding and gap
        const gridPadding = 20; // 10px padding * 2
        const gridGap = 4 * (this.game.gridSize - 1); // gap between cells
        const gridInternalSpace = gridPadding + gridGap;
        
        let calculatedGridSize = 0;
        let cellSize = 0;
        
        // Only adjust on desktop (>= 1025px)
        if (window.innerWidth >= 1025) {
            // Account for game-area gap (14px) - grid takes 80% of space, so gap affects available width
            // Grid is in 80fr column, panel is 20fr column, gap is 14px
            // Available width is approximately 80% of container width minus gap
            const gameArea = document.querySelector('.game-area');
            const gameAreaGap = gameArea ? parseFloat(window.getComputedStyle(gameArea).gap) || 14 : 14;
            
            // Available space for the grid itself (excluding padding/gaps)
            // Parent is crossword-container, which is in the 80fr column
            const gridAvailableWidth = parent.clientWidth - gridInternalSpace;
            const gridAvailableHeight = availableHeight - gridInternalSpace;
            
            // Use the smaller dimension to maintain square aspect ratio
            calculatedGridSize = Math.min(gridAvailableWidth, gridAvailableHeight);
            
            // Ensure grid doesn't exceed available space
            calculatedGridSize = Math.max(0, calculatedGridSize);
            
            // Set grid dimensions to fit available space
            if (Number.isFinite(calculatedGridSize) && calculatedGridSize > 0) {
                const totalGridSize = calculatedGridSize + gridInternalSpace;
                gridContainer.style.width = `${totalGridSize}px`;
                gridContainer.style.height = `${totalGridSize}px`;
                gridContainer.style.maxWidth = `${totalGridSize}px`;
                gridContainer.style.maxHeight = `${totalGridSize}px`;
                
                // Calculate cell size for font sizing
                cellSize = calculatedGridSize / this.game.gridSize;
            }
        } else {
            // iPad/Mobile sizing
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // Mobile: Use same cell size as iPad (based on 800px reference width)
                // This makes cells larger and requires horizontal scrolling
                const ipadReferenceWidth = 800; // Reference iPad width for consistent cell size
                const ipadGridSize = ipadReferenceWidth - gridInternalSpace;
                cellSize = ipadGridSize / this.game.gridSize;
                
                // Calculate grid size based on cell size (will be larger than viewport)
                calculatedGridSize = cellSize * this.game.gridSize;
                
                // Set grid dimensions - grid will be larger than mobile viewport
                const totalGridSize = calculatedGridSize + gridInternalSpace;
                gridContainer.style.width = `${totalGridSize}px`;
                gridContainer.style.height = `${totalGridSize}px`;
                gridContainer.style.minWidth = `${totalGridSize}px`;
                gridContainer.style.minHeight = `${totalGridSize}px`;
                // Allow horizontal scrolling
                gridContainer.style.maxWidth = 'none';
                gridContainer.style.maxHeight = 'none';
            } else {
                // iPad: size grid based on viewport width
                const viewportWidth = window.innerWidth;
                
                // Grid should use full width, which will determine cell size
                calculatedGridSize = viewportWidth - gridInternalSpace;
                
                // Set grid dimensions
                const totalGridSize = calculatedGridSize + gridInternalSpace;
                gridContainer.style.width = `${totalGridSize}px`;
                gridContainer.style.height = `${totalGridSize}px`;
                gridContainer.style.minWidth = `${totalGridSize}px`;
                gridContainer.style.minHeight = `${totalGridSize}px`;
                gridContainer.style.maxWidth = 'none';
                gridContainer.style.maxHeight = 'none';
                
                // Calculate cell size based on grid size
                cellSize = calculatedGridSize / this.game.gridSize;
            }
        }
        
        if (Number.isFinite(cellSize) && cellSize > 0) {
            gridContainer.style.setProperty('--cell-size', `${cellSize}px`);
        } else {
            gridContainer.style.removeProperty('--cell-size');
        }
        
        // Sync panel height with grid after sizing (all screen sizes)
        requestAnimationFrame(() => {
            this.syncPanelHeightWithGrid();
        });
        
        console.debug('Crossword sizing', {
            containerWidth: parent.clientWidth,
            availableHeight,
            gridAvailableWidth: window.innerWidth >= 1025 ? (parent.clientWidth - gridInternalSpace) : 'N/A',
            gridAvailableHeight: window.innerWidth >= 1025 ? (availableHeight - gridInternalSpace) : 'N/A',
            calculatedGridSize: window.innerWidth >= 1025 ? calculatedGridSize : 'N/A',
            gridSize: this.game.gridSize,
            cellSize
        });
    }
    
    syncPanelHeightWithGrid() {
        const gridContainer = document.querySelector('.crossword-container');
        const panel = document.getElementById('cluesPanel');
        const backdrop = document.getElementById('cluesBackdrop');
        
        if (!gridContainer || !panel) return;
        
        // Get the actual grid container height and position
        const gridRect = gridContainer.getBoundingClientRect();
        const gridHeight = gridRect.height;
        const gridTop = gridRect.top;
        
        if (window.innerWidth > 1024) {
            // Desktop: panel is in grid layout, match container height
            // The panel should naturally stretch in grid, but ensure it matches
            panel.style.height = `${gridHeight}px`;
            panel.style.minHeight = `${gridHeight}px`;
        } else {
            // Mobile/iPad: panel is overlay, match height and position
            panel.style.height = `${gridHeight}px`;
            panel.style.top = `${gridTop}px`;
            if (backdrop) {
                backdrop.style.height = `${gridHeight}px`;
                backdrop.style.top = `${gridTop}px`;
            }
        }
    }
}


