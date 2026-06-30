import { GameState } from './game-state.js';
import type { CellView } from './game-state.js';
import type { Difficulty } from './sudoku-generator.js';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

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

	constructor(root: HTMLElement) {
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
		this.difficultyEl = SudokuApp.requireElement(root, '.difficulty') as HTMLSelectElement;
		this.notesBtn = SudokuApp.requireElement(root, '.notes-toggle') as HTMLButtonElement;

		this.buildBoard();
		this.buildNumberPad(root);
		this.bindControls(root);
		this.bindKeyboard();
		this.startNewGame('easy');
	}

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

	private bindControls(root: HTMLElement): void {
		this.difficultyEl.innerHTML = '';
		for (const level of DIFFICULTIES) {
			const option = document.createElement('option');
			option.value = level;
			option.textContent = level.charAt(0).toUpperCase() + level.slice(1);
			this.difficultyEl.appendChild(option);
		}

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

	private bindKeyboard(): void {
		document.addEventListener('keydown', (event) => this.onKeyDown(event));
	}

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

	private onCellClick(index: number): void {
		this.game.select(index);
		this.render();
	}

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

	private afterInput(): void {
		this.render();
		if (this.game.isSolved() === true) {
			this.onSolved();
		}
	}

	private toggleNotesMode(): void {
		this.notesMode = this.notesMode === false;
		this.notesBtn.classList.toggle('active', this.notesMode);
		this.notesBtn.setAttribute('aria-pressed', String(this.notesMode));
	}

	private startNewGame(difficulty: Difficulty): void {
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

	private onSolved(): void {
		this.solved = true;
		this.stopTimer();
		this.boardEl.classList.add('solved');
		this.statusEl.classList.add('won');
		this.statusEl.textContent = `Solved in ${SudokuApp.formatTime(this.elapsedMs)}! 🎉`;
	}

	private restartTimer(): void {
		this.stopTimer();
		this.startedAt = Date.now();
		this.elapsedMs = 0;
		this.updateTimer();
		this.timerId = window.setInterval(() => this.updateTimer(), 250);
	}

	private stopTimer(): void {
		if (this.timerId !== 0) {
			window.clearInterval(this.timerId);
			this.timerId = 0;
		}
	}

	private updateTimer(): void {
		this.elapsedMs = Date.now() - this.startedAt;
		this.timerEl.textContent = SudokuApp.formatTime(this.elapsedMs);
	}

	private render(): void {
		const cells = this.game.getCells();
		for (const view of cells) {
			this.renderCell(this.cellEls[view.index], view);
		}
		this.renderPad();
	}

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
		if (SudokuApp.isBoxAlt(view.index) === true) {
			el.classList.add('box-alt');
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

	private static isBoxAlt(index: number): boolean {
		const boxRow = Math.floor(Math.floor(index / 9) / 3);
		const boxCol = Math.floor((index % 9) / 3);
		return (boxRow + boxCol) % 2 === 1;
	}

	private static formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	private static requireElement<T extends HTMLElement>(root: HTMLElement, selector: string): T {
		const found = root.querySelector(selector);
		if (found === null) {
			throw new Error(`Missing required element: ${selector}`);
		}
		return found as T;
	}
}
