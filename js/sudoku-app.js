import { GameState } from './game-state.js';
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const DIFFICULTY_STORAGE_KEY = 'sudoku:difficulty';
/** Wires the DOM (board, number pad, controls, keyboard) to a {@link GameState}. */
export class SudokuApp {
    /**
     * Builds the UI, restores the saved difficulty, and starts a new game.
     * @param root Container element holding the app's markup.
     */
    constructor(root) {
        const difficulty = SudokuApp.loadDifficulty();
        this.game = new GameState(difficulty);
        this.notesMode = false;
        this.startedAt = Date.now();
        this.elapsedMs = 0;
        this.timerId = 0;
        this.solved = false;
        this.cellEls = [];
        this.padButtons = new Map();
        this.boardEl = SudokuApp.requireElement(root, '.board');
        this.timerEl = SudokuApp.requireElement(root, '.timer');
        this.statusEl = SudokuApp.requireElement(root, '.status');
        this.difficultyEl = SudokuApp.requireElement(root, '.difficulty');
        this.notesBtn = SudokuApp.requireElement(root, '.notes-toggle');
        this.buildBoard();
        this.buildNumberPad(root);
        this.bindControls(root);
        this.bindKeyboard();
        this.startNewGame(difficulty);
    }
    /** Creates the 81 cell buttons and wires their click handlers. */
    buildBoard() {
        this.boardEl.innerHTML = '';
        for (let index = 0; index < 81; index += 1) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'cell';
            cell.dataset.index = String(index);
            cell.addEventListener('click', () => this.onCellClick(index));
            this.boardEl.appendChild(cell);
            this.cellEls.push(cell);
        }
    }
    /**
     * Creates the 1..9 number pad buttons.
     * @param root Container element holding the `.numberpad` element.
     */
    buildNumberPad(root) {
        const pad = SudokuApp.requireElement(root, '.numberpad');
        pad.innerHTML = '';
        for (let value = 1; value <= 9; value += 1) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'pad-btn';
            button.innerHTML = `<span class="pad-digit">${value}</span><span class="pad-count"></span>`;
            button.addEventListener('click', () => this.onNumberInput(value));
            pad.appendChild(button);
            this.padButtons.set(value, button);
        }
    }
    /**
     * Populates the difficulty selector and binds the control buttons. Changing
     * the selector persists the choice immediately, even before a new game.
     * @param root Container element holding the control elements.
     */
    bindControls(root) {
        this.difficultyEl.innerHTML = '';
        for (const level of DIFFICULTIES) {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level.charAt(0).toUpperCase() + level.slice(1);
            this.difficultyEl.appendChild(option);
        }
        this.difficultyEl.addEventListener('change', () => {
            SudokuApp.saveDifficulty(this.difficultyEl.value);
        });
        SudokuApp.requireElement(root, '.new-game').addEventListener('click', () => {
            this.startNewGame(this.difficultyEl.value);
        });
        SudokuApp.requireElement(root, '.erase').addEventListener('click', () => {
            this.game.clear();
            this.render();
        });
        SudokuApp.requireElement(root, '.hint').addEventListener('click', () => {
            if (this.game.revealHint() === true) {
                this.afterInput();
            }
        });
        this.notesBtn.addEventListener('click', () => this.toggleNotesMode());
    }
    /** Installs the global keydown handler for number entry and navigation. */
    bindKeyboard() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
    }
    /**
     * Routes keystrokes: 1-9 enter a value, Backspace/Delete/0 clear, N toggles
     * notes mode, and arrow keys move the selection.
     * @param event The keyboard event.
     */
    onKeyDown(event) {
        if (event.key >= '1' && event.key <= '9') {
            this.onNumberInput(Number(event.key));
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
            this.game.clear();
            this.render();
            return;
        }
        if (event.key === 'n' || event.key === 'N') {
            this.toggleNotesMode();
            return;
        }
        const moves = {
            ArrowUp: -9,
            ArrowDown: 9,
            ArrowLeft: -1,
            ArrowRight: 1,
        };
        const delta = moves[event.key];
        if (delta !== undefined) {
            event.preventDefault();
            this.moveSelection(delta);
        }
    }
    /**
     * Moves the selection by a cell offset, staying on the board and preventing
     * horizontal moves from wrapping across row boundaries.
     * @param delta Index offset (+/-1 horizontal, +/-9 vertical).
     */
    moveSelection(delta) {
        const current = this.game.getSelected();
        const start = current < 0 ? 0 : current;
        const next = start + delta;
        if (next < 0 || next > 80) {
            return;
        }
        if (Math.abs(delta) === 1 && Math.floor(next / 9) !== Math.floor(start / 9)) {
            return;
        }
        this.game.select(next);
        this.render();
    }
    /**
     * Selects a cell in response to a click.
     * @param index Cell index 0..80.
     */
    onCellClick(index) {
        this.game.select(index);
        this.render();
    }
    /**
     * Applies a digit to the selected cell, as a note or a value depending on the
     * current mode. Ignored once the puzzle is solved.
     * @param value Digit 1..9.
     */
    onNumberInput(value) {
        if (this.solved === true) {
            return;
        }
        if (this.notesMode === true) {
            this.game.toggleNote(value);
        }
        else {
            this.game.setValue(value);
        }
        this.afterInput();
    }
    /** Re-renders and checks for a win after any board-changing input. */
    afterInput() {
        this.render();
        if (this.game.isSolved() === true) {
            this.onSolved();
        }
    }
    /** Flips notes (pencil-mark) mode and updates the toggle button's state. */
    toggleNotesMode() {
        this.notesMode = this.notesMode === false;
        this.notesBtn.classList.toggle('active', this.notesMode);
        this.notesBtn.setAttribute('aria-pressed', String(this.notesMode));
    }
    /**
     * Starts a fresh puzzle: generates it, persists the difficulty, resets UI
     * state, and restarts the timer.
     * @param difficulty Difficulty of the new puzzle.
     */
    startNewGame(difficulty) {
        this.game.newGame(difficulty);
        SudokuApp.saveDifficulty(difficulty);
        this.difficultyEl.value = difficulty;
        this.solved = false;
        this.notesMode = false;
        this.notesBtn.classList.remove('active');
        this.statusEl.textContent = '';
        this.statusEl.classList.remove('won');
        this.boardEl.classList.remove('solved');
        this.restartTimer();
        this.render();
    }
    /** Handles a win: stops the timer and shows the completion time. */
    onSolved() {
        this.solved = true;
        this.stopTimer();
        this.boardEl.classList.add('solved');
        this.statusEl.classList.add('won');
        this.statusEl.textContent = `Solved in ${SudokuApp.formatTime(this.elapsedMs)}! 🎉`;
    }
    /** Resets the elapsed time and starts ticking the timer every 250ms. */
    restartTimer() {
        this.stopTimer();
        this.startedAt = Date.now();
        this.elapsedMs = 0;
        this.updateTimer();
        this.timerId = window.setInterval(() => this.updateTimer(), 250);
    }
    /** Stops the timer interval if one is running. */
    stopTimer() {
        if (this.timerId !== 0) {
            window.clearInterval(this.timerId);
            this.timerId = 0;
        }
    }
    /** Recomputes elapsed time and writes it to the timer display. */
    updateTimer() {
        this.elapsedMs = Date.now() - this.startedAt;
        this.timerEl.textContent = SudokuApp.formatTime(this.elapsedMs);
    }
    /** Renders every cell and the number pad from the current game state. */
    render() {
        const cells = this.game.getCells();
        for (const view of cells) {
            this.renderCell(this.cellEls[view.index], view);
        }
        this.renderPad();
    }
    /**
     * Applies a cell's view model to its DOM element: status/highlight classes,
     * then either its value or its pencil-mark grid.
     * @param el The cell's DOM element.
     * @param view The cell's view model.
     */
    renderCell(el, view) {
        el.className = 'cell';
        el.classList.add(`status-${view.status}`);
        if (view.selected === true) {
            el.classList.add('selected');
        }
        if (view.highlighted === true) {
            el.classList.add('highlighted');
        }
        if (view.sameValue === true) {
            el.classList.add('same-value');
        }
        if (view.value !== 0) {
            el.textContent = String(view.value);
            return;
        }
        if (view.notes.length === 0) {
            el.textContent = '';
            return;
        }
        el.textContent = '';
        const grid = document.createElement('div');
        grid.className = 'notes';
        for (let n = 1; n <= 9; n += 1) {
            const slot = document.createElement('span');
            slot.textContent = view.notes.includes(n) === true ? String(n) : '';
            grid.appendChild(slot);
        }
        el.appendChild(grid);
    }
    /** Updates each pad button's remaining count and exhausted state. */
    renderPad() {
        for (const [value, button] of this.padButtons) {
            const remaining = this.game.remainingForValue(value);
            const count = button.querySelector('.pad-count');
            if (count !== null) {
                count.textContent = remaining > 0 ? String(remaining) : '';
            }
            button.classList.toggle('exhausted', remaining <= 0);
        }
    }
    /**
     * Reads the saved difficulty, validating it against the known set.
     * @returns The stored difficulty, or 'easy' if missing, invalid, or storage
     * is unavailable.
     */
    static loadDifficulty() {
        try {
            const saved = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
            if (saved !== null && DIFFICULTIES.includes(saved) === true) {
                return saved;
            }
        }
        catch {
            return 'easy';
        }
        return 'easy';
    }
    /**
     * Persists the chosen difficulty, ignoring storage failures.
     * @param difficulty Difficulty to store.
     */
    static saveDifficulty(difficulty) {
        try {
            window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
        }
        catch {
            return;
        }
    }
    /**
     * Formats a duration as mm:ss.
     * @param ms Elapsed time in milliseconds.
     * @returns Zero-padded minutes and seconds.
     */
    static formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    /**
     * Finds a required descendant element or throws if it is missing.
     * @param root Element to search within.
     * @param selector CSS selector for the target element.
     * @returns The matched element, typed as T.
     */
    static requireElement(root, selector) {
        const found = root.querySelector(selector);
        if (found === null) {
            throw new Error(`Missing required element: ${selector}`);
        }
        return found;
    }
}
//# sourceMappingURL=sudoku-app.js.map