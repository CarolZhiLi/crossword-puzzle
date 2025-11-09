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
        if (!gridContainer) {
            console.error('Grid container not found in adjustGridSize');
            return;
        }
        
        if (!this.game.gridSize) {
            console.warn('Grid size not set:', this.game.gridSize);
            return;
        }

        // Ensure grid is visible
        if (gridContainer.style.display === 'none') {
            gridContainer.style.display = 'grid';
        }

        // Determine device type and set FIXED cell size
        // Fixed cell sizes per device type (not based on container size)
        const isDesktop = window.innerWidth >= 1025;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        const isMobile = window.innerWidth <= 768;
        
        let baseCellSize;
        
        if (isDesktop) {
            // Desktop: Fixed larger cell size
            baseCellSize = 40; // Fixed 40px per cell
        } else if (isTablet) {
            // Tablet: Fixed medium cell size
            baseCellSize = 32; // Fixed 32px per cell
        } else {
            // Mobile: Fixed smaller cell size
            baseCellSize = 24; // Fixed 24px per cell
        }
        
        // Grid internal spacing
        const gridPadding = 20; // 10px padding * 2
        const gridGap = 4 * (this.game.gridSize - 1); // gap between cells
        const gridInternalSpace = gridPadding + gridGap;
        
        // Calculate actual grid size based on FIXED cell size and grid dimensions
        // Grid can be larger than container if needed (will scroll)
        const calculatedGridWidth = baseCellSize * this.game.gridSize;
        const calculatedGridHeight = baseCellSize * this.game.gridSize;
        
        // Total grid size including padding and gaps
        const totalGridWidth = calculatedGridWidth + gridInternalSpace;
        const totalGridHeight = calculatedGridHeight + gridInternalSpace;
        
        // Set grid dimensions (can exceed container for scrolling)
        gridContainer.style.width = `${totalGridWidth}px`;
        gridContainer.style.height = `${totalGridHeight}px`;
        gridContainer.style.minWidth = `${totalGridWidth}px`;
        gridContainer.style.minHeight = `${totalGridHeight}px`;
        gridContainer.style.maxWidth = 'none';
        gridContainer.style.maxHeight = 'none';
        
        // Set grid template columns and rows with fixed cell size
        gridContainer.style.gridTemplateColumns = `repeat(${this.game.gridSize}, ${baseCellSize}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${this.game.gridSize}, ${baseCellSize}px)`;
        
        // Set cell size CSS variable for font sizing
        if (Number.isFinite(baseCellSize) && baseCellSize > 0) {
            gridContainer.style.setProperty('--cell-size', `${baseCellSize}px`);
        } else {
            gridContainer.style.removeProperty('--cell-size');
        }
        
        // Sync panel height with grid after sizing (all screen sizes)
        requestAnimationFrame(() => {
            this.game.syncPanelHeightWithGrid();
        });
        
        console.debug('Crossword sizing', {
            device: isDesktop ? 'desktop' : (isTablet ? 'tablet' : 'mobile'),
            gridSize: this.game.gridSize,
            baseCellSize,
            calculatedGridWidth,
            calculatedGridHeight,
            totalGridWidth,
            totalGridHeight
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
            // Remove any inline top style that might have been set on mobile
            panel.style.height = `${gridHeight}px`;
            panel.style.minHeight = `${gridHeight}px`;
            panel.style.top = '';
            if (backdrop) {
                backdrop.style.top = '';
            }
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

