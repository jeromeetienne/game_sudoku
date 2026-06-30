import { GameState } from './game-state.js';
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
export class SudokuApp {
    constructor(root) {
        this.game = new GameState('easy');
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
        this.startNewGame('easy');
    }
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
    bindControls(root) {
        this.difficultyEl.innerHTML = '';
        for (const level of DIFFICULTIES) {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level.charAt(0).toUpperCase() + level.slice(1);
            this.difficultyEl.appendChild(option);
        }
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
    bindKeyboard() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
    }
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
    onCellClick(index) {
        this.game.select(index);
        this.render();
    }
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
    afterInput() {
        this.render();
        if (this.game.isSolved() === true) {
            this.onSolved();
        }
    }
    toggleNotesMode() {
        this.notesMode = this.notesMode === false;
        this.notesBtn.classList.toggle('active', this.notesMode);
        this.notesBtn.setAttribute('aria-pressed', String(this.notesMode));
    }
    startNewGame(difficulty) {
        this.game.newGame(difficulty);
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
    onSolved() {
        this.solved = true;
        this.stopTimer();
        this.boardEl.classList.add('solved');
        this.statusEl.classList.add('won');
        this.statusEl.textContent = `Solved in ${SudokuApp.formatTime(this.elapsedMs)}! 🎉`;
    }
    restartTimer() {
        this.stopTimer();
        this.startedAt = Date.now();
        this.elapsedMs = 0;
        this.updateTimer();
        this.timerId = window.setInterval(() => this.updateTimer(), 250);
    }
    stopTimer() {
        if (this.timerId !== 0) {
            window.clearInterval(this.timerId);
            this.timerId = 0;
        }
    }
    updateTimer() {
        this.elapsedMs = Date.now() - this.startedAt;
        this.timerEl.textContent = SudokuApp.formatTime(this.elapsedMs);
    }
    render() {
        const cells = this.game.getCells();
        for (const view of cells) {
            this.renderCell(this.cellEls[view.index], view);
        }
        this.renderPad();
    }
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
        if (SudokuApp.isBoxEdgeRight(view.index) === true) {
            el.classList.add('box-right');
        }
        if (SudokuApp.isBoxEdgeBottom(view.index) === true) {
            el.classList.add('box-bottom');
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
    static isBoxEdgeRight(index) {
        const col = index % 9;
        return col === 2 || col === 5;
    }
    static isBoxEdgeBottom(index) {
        const row = Math.floor(index / 9);
        return row === 2 || row === 5;
    }
    static formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    static requireElement(root, selector) {
        const found = root.querySelector(selector);
        if (found === null) {
            throw new Error(`Missing required element: ${selector}`);
        }
        return found;
    }
}
//# sourceMappingURL=sudoku-app.js.map