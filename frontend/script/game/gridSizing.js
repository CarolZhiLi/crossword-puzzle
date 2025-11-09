// Responsive grid sizing and layout management
export class GridSizing {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.maxVisibleRows = 0;
    this.maxVisibleCols = 0;
  }

  setupResponsiveGrid() {
    // Handle window resize to maintain grid responsiveness
    window.addEventListener("resize", () => {
      this.calculateMaxVisibleCells();
      this.adjustGridSize();
    });

    // Calculate max visible cells on initial load
    this.calculateMaxVisibleCells();

    // Initial adjustment
    this.adjustGridSize();
  }

  calculateMaxVisibleCells() {
    const container = document.querySelector(".crossword-container");
    if (!container) {
      console.warn("Container not found for max visible cells calculation");
      return;
    }

    // Determine device type and get cell size
    const isDesktop = window.innerWidth >= 1025;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    const isMobile = window.innerWidth <= 768;

    let baseCellSize;
    if (isDesktop) {
      baseCellSize = 50;
    } else if (isTablet) {
      baseCellSize = 30;
    } else {
      baseCellSize = 30;
    }

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width || window.innerWidth * 0.9;
    const containerHeight = containerRect.height || window.innerHeight * 0.9;

    // Grid internal spacing
    const gridPadding = 20; // 10px padding * 2
    const gridGap = 4; // gap between cells

    // Calculate how many cells can fit
    const availableWidth = containerWidth - gridPadding;
    const availableHeight = containerHeight - gridPadding;

    this.maxVisibleCols = Math.floor(availableWidth / (baseCellSize + gridGap));
    this.maxVisibleRows = Math.floor(
      availableHeight / (baseCellSize + gridGap)
    );

    console.debug("Max visible cells calculated:", {
      maxVisibleRows: this.maxVisibleRows,
      maxVisibleCols: this.maxVisibleCols,
      containerWidth,
      containerHeight,
      baseCellSize,
    });
  }

  adjustGridSize() {
    const gridContainer = document.getElementById("crosswordGrid");
    if (!gridContainer) {
      console.error("Grid container not found in adjustGridSize");
      return;
    }

    if (!this.game.finalGridRows || !this.game.finalGridCols) {
      console.warn("Final grid size not set:", {
        finalGridRows: this.game.finalGridRows,
        finalGridCols: this.game.finalGridCols,
      });
      return;
    }

    // Ensure grid is visible
    if (gridContainer.style.display === "none") {
      gridContainer.style.display = "grid";
    }

    // Determine device type and set FIXED cell size
    // Fixed cell sizes per device type (not based on container size)
    const isDesktop = window.innerWidth >= 1025;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    const isMobile = window.innerWidth <= 768;

    let baseCellSize;

    if (isDesktop) {
      // Desktop: Fixed larger cell size
      baseCellSize = 51; // Fixed 50px per cell
    } else if (isTablet) {
      // Tablet: Fixed medium cell size
      baseCellSize = 30; // Fixed 30px per cell
    } else {
      // Mobile: Fixed smaller cell size
      baseCellSize = 30; // Fixed 30px per cell
    }

    // Grid internal spacing
    const gridPadding = 20; // 10px padding * 2
    const gridGap = 4; // gap between cells
    const gridGapTotalCols = gridGap * (this.game.finalGridCols - 1);
    const gridGapTotalRows = gridGap * (this.game.finalGridRows - 1);
    const gridInternalSpaceCols = gridPadding + gridGapTotalCols;
    const gridInternalSpaceRows = gridPadding + gridGapTotalRows;

    // Calculate actual grid size based on FIXED cell size and final grid dimensions
    // Grid can be larger than container if needed (will scroll)
    const calculatedGridWidth = baseCellSize * this.game.finalGridCols;
    const calculatedGridHeight = baseCellSize * this.game.finalGridRows;

    // Total grid size including padding and gaps
    const totalGridWidth = calculatedGridWidth + gridInternalSpaceCols;
    const totalGridHeight = calculatedGridHeight + gridInternalSpaceRows;

    // Set grid dimensions (can exceed container for scrolling)
    gridContainer.style.width = `${totalGridWidth}px`;
    gridContainer.style.height = `${totalGridHeight}px`;
    gridContainer.style.minWidth = `${totalGridWidth}px`;
    gridContainer.style.minHeight = `${totalGridHeight}px`;
    gridContainer.style.maxWidth = "none";
    gridContainer.style.maxHeight = "none";

    // Set grid template columns and rows with fixed cell size
    gridContainer.style.gridTemplateColumns = `repeat(${this.game.finalGridCols}, ${baseCellSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${this.game.finalGridRows}, ${baseCellSize}px)`;

    // Set cell size CSS variable for font sizing
    if (Number.isFinite(baseCellSize) && baseCellSize > 0) {
      gridContainer.style.setProperty("--cell-size", `${baseCellSize}px`);
    } else {
      gridContainer.style.removeProperty("--cell-size");
    }

    // Sync panel height with grid after sizing (all screen sizes)
    requestAnimationFrame(() => {
      this.game.syncPanelHeightWithGrid();
    });

    console.debug("Crossword sizing", {
      device: isDesktop ? "desktop" : isTablet ? "tablet" : "mobile",
      puzzleSize: this.game.gridSize,
      finalGridRows: this.game.finalGridRows,
      finalGridCols: this.game.finalGridCols,
      baseCellSize,
      calculatedGridWidth,
      calculatedGridHeight,
      totalGridWidth,
      totalGridHeight,
    });
  }

  syncPanelHeightWithGrid() {
    const gridContainer = document.querySelector(".crossword-container");
    const panel = document.getElementById("cluesPanel");
    const backdrop = document.getElementById("cluesBackdrop");

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
      panel.style.top = "";
      if (backdrop) {
        backdrop.style.top = "";
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
