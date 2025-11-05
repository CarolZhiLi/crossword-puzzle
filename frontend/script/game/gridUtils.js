// Grid normalization and utility functions
export class GridUtils {
    static normalizeGrid(grid) {
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
}


