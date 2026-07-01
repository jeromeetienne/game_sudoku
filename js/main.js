import { SudokuApp } from './sudoku-app.js';
/** Entry point: boots the app once the root `.app` element is present. */
const root = document.querySelector('.app');
if (root instanceof HTMLElement) {
    new SudokuApp(root);
}
//# sourceMappingURL=main.js.map