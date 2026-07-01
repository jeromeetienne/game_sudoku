import { GameState } from './game-state.js';
import type { CellView } from './game-state.js';
import type { Difficulty } from './sudoku-generator.js';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const DIFFICULTY_STORAGE_KEY = 'sudoku:difficulty';

/** Wires the DOM (board, number pad, controls, keyboard) to a {@link GameState}. */
export class SudokuApp {
	private game: GameState;
	private notesMode: boolean;
	private startedAt: number;
	private elapsedMs: number;
	private timerId: number;
	private solved: boolean;

	private boardEl: HTMLElement;
	private cellEls: HTMLElement[];
	private timerEl: HTMLElement;
	private statusEl: HTMLElement;
	private difficultyEl: HTMLSelectElement;
	private notesBtn: HTMLButtonElement;
	private padButtons: Map<number, HTMLButtonElement>;

	/**
	 * Builds the UI, restores the saved difficulty, and starts a new game.
	 * @param root Container element holding the app's markup.
	 */
	constructor(root: HTMLElement) {
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
		this.difficultyEl = SudokuApp.requireElement(root, '.difficulty') as HTMLSelectElement;
		this.notesBtn = SudokuApp.requireElement(root, '.notes-toggle') as HTMLButtonElement;

		this.buildBoard();
		this.buildNumberPad(root);
		this.bindControls(root);
		this.bindKeyboard();
		this.startNewGame(difficulty);
	}

	/** Creates the 81 cell buttons and wires their click handlers. */
	private buildBoard(): void {
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
	private buildNumberPad(root: HTMLElement): void {
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
	private bindControls(root: HTMLElement): void {
		this.difficultyEl.innerHTML = '';
		for (const level of DIFFICULTIES) {
			const option = document.createElement('option');
			option.value = level;
			option.textContent = level.charAt(0).toUpperCase() + level.slice(1);
			this.difficultyEl.appendChild(option);
		}

		this.difficultyEl.addEventListener('change', () => {
			SudokuApp.saveDifficulty(this.difficultyEl.value as Difficulty);
		});

		SudokuApp.requireElement(root, '.new-game').addEventListener('click', () => {
			this.startNewGame(this.difficultyEl.value as Difficulty);
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
	private bindKeyboard(): void {
		document.addEventListener('keydown', (event) => this.onKeyDown(event));
	}

	/**
	 * Routes keystrokes: 1-9 enter a value, Backspace/Delete/0 clear, N toggles
	 * notes mode, and arrow keys move the selection.
	 * @param event The keyboard event.
	 */
	private onKeyDown(event: KeyboardEvent): void {
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
		const moves: Record<string, number> = {
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
	private moveSelection(delta: number): void {
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
	private onCellClick(index: number): void {
		this.game.select(index);
		this.render();
	}

	/**
	 * Applies a digit to the selected cell, as a note or a value depending on the
	 * current mode. Ignored once the puzzle is solved.
	 * @param value Digit 1..9.
	 */
	private onNumberInput(value: number): void {
		if (this.solved === true) {
			return;
		}
		if (this.notesMode === true) {
			this.game.toggleNote(value);
		} else {
			this.game.setValue(value);
		}
		this.afterInput();
	}

	/** Re-renders and checks for a win after any board-changing input. */
	private afterInput(): void {
		this.render();
		if (this.game.isSolved() === true) {
			this.onSolved();
		}
	}

	/** Flips notes (pencil-mark) mode and updates the toggle button's state. */
	private toggleNotesMode(): void {
		this.notesMode = this.notesMode === false;
		this.notesBtn.classList.toggle('active', this.notesMode);
		this.notesBtn.setAttribute('aria-pressed', String(this.notesMode));
	}

	/**
	 * Starts a fresh puzzle: generates it, persists the difficulty, resets UI
	 * state, and restarts the timer.
	 * @param difficulty Difficulty of the new puzzle.
	 */
	private startNewGame(difficulty: Difficulty): void {
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
	private onSolved(): void {
		this.solved = true;
		this.stopTimer();
		this.boardEl.classList.add('solved');
		this.statusEl.classList.add('won');
		this.statusEl.textContent = `Solved in ${SudokuApp.formatTime(this.elapsedMs)}! 🎉`;
	}

	/** Resets the elapsed time and starts ticking the timer every 250ms. */
	private restartTimer(): void {
		this.stopTimer();
		this.startedAt = Date.now();
		this.elapsedMs = 0;
		this.updateTimer();
		this.timerId = window.setInterval(() => this.updateTimer(), 250);
	}

	/** Stops the timer interval if one is running. */
	private stopTimer(): void {
		if (this.timerId !== 0) {
			window.clearInterval(this.timerId);
			this.timerId = 0;
		}
	}

	/** Recomputes elapsed time and writes it to the timer display. */
	private updateTimer(): void {
		this.elapsedMs = Date.now() - this.startedAt;
		this.timerEl.textContent = SudokuApp.formatTime(this.elapsedMs);
	}

	/** Renders every cell and the number pad from the current game state. */
	private render(): void {
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
	private renderCell(el: HTMLElement, view: CellView): void {
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
	private renderPad(): void {
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
	private static loadDifficulty(): Difficulty {
		try {
			const saved = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
			if (saved !== null && DIFFICULTIES.includes(saved as Difficulty) === true) {
				return saved as Difficulty;
			}
		} catch {
			return 'easy';
		}
		return 'easy';
	}

	/**
	 * Persists the chosen difficulty, ignoring storage failures.
	 * @param difficulty Difficulty to store.
	 */
	private static saveDifficulty(difficulty: Difficulty): void {
		try {
			window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
		} catch {
			return;
		}
	}

	/**
	 * Formats a duration as mm:ss.
	 * @param ms Elapsed time in milliseconds.
	 * @returns Zero-padded minutes and seconds.
	 */
	private static formatTime(ms: number): string {
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
	private static requireElement<T extends HTMLElement>(root: HTMLElement, selector: string): T {
		const found = root.querySelector(selector);
		if (found === null) {
			throw new Error(`Missing required element: ${selector}`);
		}
		return found as T;
	}
}
