# CSS Architecture

This directory contains modular CSS files organized by component and functionality.

## File Structure

### Main Entry Point
- **`styles.css`** - Main file that imports all other CSS modules

### Component Files
- **`base.css`** - Reset styles, typography, global styles, utility classes
- **`layout.css`** - Main layout structure (game-container, game-area)
- **`header.css`** - Header bar, timer, logo, navigation elements
- **`grid.css`** - Crossword grid, cells, and grid-related styles
- **`panel.css`** - Clue panel, clues list, panel interactions
- **`buttons.css`** - All button styles (regular, icon, large buttons)
- **`controls.css`** - Controls bar, dropdowns, game controls
- **`modals.css`** - Authentication modals, game modals, popups
- **`responsive.css`** - ALL media queries organized by breakpoint

## Breakpoint Structure

All responsive styles are in `responsive.css` organized by screen size:

- **Desktop (> 1024px)**: Full desktop layout with side-by-side grid and panel
- **iPad (769px - 1024px)**: Mobile icons, overlay panel, bottom arrow button
- **Mobile (≤ 768px)**: Stacked header, centered icons, overlay panel

## Adding New Styles

1. **Component-specific styles**: Add to the appropriate component file (e.g., `buttons.css` for buttons)
2. **Responsive styles**: Add to `responsive.css` in the appropriate breakpoint section
3. **New components**: Create a new file (e.g., `footer.css`) and import it in `styles.css`

## Benefits

- ✅ Clear separation of concerns
- ✅ Easy to find styles for specific components
- ✅ All responsive styles in one place
- ✅ Better maintainability
- ✅ Easier to understand screen size behavior

