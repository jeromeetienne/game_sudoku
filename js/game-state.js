import { SudokuGenerator } from './sudoku-generator.js';
const CELL_COUNT = 81;
/** Holds the mutable state of a single Sudoku game and derives view models from it. */
export class GameState {
    /**
     * @param difficulty Difficulty of the first puzzle to generate.
     */
    constructor(difficulty) {
        this.difficulty = difficulty;
        this.puzzle = SudokuGenerator.generate(difficulty);
        this.values = this.puzzle.given.slice();
        this.notes = Array.from({ length: CELL_COUNT }, () => new Set());
        this.selectedIndex = -1;
    }
    /** @returns The difficulty of the current puzzle. */
    getDifficulty() {
        return this.difficulty;
    }
    /**
     * Replaces the puzzle with a freshly generated one and resets all state.
     * @param difficulty Difficulty of the new puzzle.
     */
    newGame(difficulty) {
        this.difficulty = difficulty;
        this.puzzle = SudokuGenerator.generate(difficulty);
        this.values = this.puzzle.given.slice();
        this.notes = Array.from({ length: CELL_COUNT }, () => new Set());
        this.selectedIndex = -1;
    }
    /**
     * Marks a cell as selected.
     * @param index Cell index 0..80, or a negative value to clear the selection.
     */
    select(index) {
        this.selectedIndex = index;
    }
    /** @returns The selected cell index, or -1 if none is selected. */
    getSelected() {
        return this.selectedIndex;
    }
    /**
     * @param index Cell index 0..80.
     * @returns True if the cell is a fixed clue from the puzzle.
     */
    isGiven(index) {
        return this.puzzle.given[index] !== 0;
    }
    /**
     * Sets the selected cell to a value, or clears it if it already holds that
     * value (toggle). Givens are ignored, and setting a value clears its notes.
     * @param value Value 1..9 to place.
     */
    setValue(value) {
        const index = this.selectedIndex;
        if (index < 0 || this.isGiven(index) === true) {
            return;
        }
        if (this.values[index] === value) {
            this.values[index] = 0;
        }
        else {
            this.values[index] = value;
            this.notes[index].clear();
        }
    }
    /**
     * Toggles a pencil mark on the selected cell. No-op on givens or cells that
     * already hold a value.
     * @param value Note value 1..9 to toggle.
     */
    toggleNote(value) {
        const index = this.selectedIndex;
        if (index < 0 || this.isGiven(index) === true || this.values[index] !== 0) {
            return;
        }
        if (this.notes[index].has(value) === true) {
            this.notes[index].delete(value);
        }
        else {
            this.notes[index].add(value);
        }
    }
    /** Clears the value and notes of the selected cell, unless it is a given. */
    clear() {
        const index = this.selectedIndex;
        if (index < 0 || this.isGiven(index) === true) {
            return;
        }
        this.values[index] = 0;
        this.notes[index].clear();
    }
    /**
     * Fills the selected cell with its correct value from the solution.
     * @returns True if a hint was applied, false if the cell was a given or none
     * was selected.
     */
    revealHint() {
        const index = this.selectedIndex;
        if (index < 0 || this.isGiven(index) === true) {
            return false;
        }
        this.values[index] = this.puzzle.solution[index];
        this.notes[index].clear();
        return true;
    }
    /**
     * @param value Value 1..9.
     * @returns How many of this value are still unplaced (9 minus current count).
     */
    remainingForValue(value) {
        let used = 0;
        for (let i = 0; i < CELL_COUNT; i += 1) {
            if (this.values[i] === value) {
                used += 1;
            }
        }
        return 9 - used;
    }
    /** @returns True when every cell matches the solution. */
    isSolved() {
        for (let i = 0; i < CELL_COUNT; i += 1) {
            if (this.values[i] !== this.puzzle.solution[i]) {
                return false;
            }
        }
        return true;
    }
    /**
     * Builds an immutable view model for every cell, including status and
     * highlight flags relative to the current selection.
     * @returns 81 cell views in row-major order.
     */
    getCells() {
        const conflicts = this.findConflicts();
        const selectedValue = this.selectedIndex >= 0 ? this.values[this.selectedIndex] : 0;
        const cells = [];
        for (let index = 0; index < CELL_COUNT; index += 1) {
            const value = this.values[index];
            cells.push({
                index,
                value,
                notes: Array.from(this.notes[index]).sort((a, b) => a - b),
                status: this.statusOf(index, conflicts),
                selected: index === this.selectedIndex,
                highlighted: this.isPeer(index),
                sameValue: value !== 0 && value === selectedValue,
            });
        }
        return cells;
    }
    /**
     * Classifies a cell for rendering. Order matters: givens and conflicts take
     * precedence over the plain filled/empty/wrong classification.
     * @param index Cell index 0..80.
     * @param conflicts Set of indices currently in conflict.
     * @returns The cell's display status.
     */
    statusOf(index, conflicts) {
        if (this.isGiven(index) === true) {
            return 'given';
        }
        if (conflicts.has(index) === true) {
            return 'conflict';
        }
        if (this.values[index] === 0) {
            return 'empty';
        }
        if (this.values[index] !== this.puzzle.solution[index]) {
            return 'wrong';
        }
        return 'filled';
    }
    /**
     * @param index Cell index 0..80.
     * @returns True if the cell shares a row, column, or box with the selection
     * (and is not the selection itself).
     */
    isPeer(index) {
        if (this.selectedIndex < 0 || index === this.selectedIndex) {
            return false;
        }
        const sameRow = SudokuGenerator.rowOf(index) === SudokuGenerator.rowOf(this.selectedIndex);
        const sameCol = SudokuGenerator.colOf(index) === SudokuGenerator.colOf(this.selectedIndex);
        const sameBox = SudokuGenerator.boxOf(index) === SudokuGenerator.boxOf(this.selectedIndex);
        return sameRow === true || sameCol === true || sameBox === true;
    }
    /**
     * Finds every cell that shares its value with a peer (same row, column, or
     * box); both offending cells are flagged.
     * @returns The set of conflicting cell indices.
     */
    findConflicts() {
        const conflicts = new Set();
        for (let index = 0; index < CELL_COUNT; index += 1) {
            const value = this.values[index];
            if (value === 0) {
                continue;
            }
            for (let other = 0; other < CELL_COUNT; other += 1) {
                if (other === index || this.values[other] !== value) {
                    continue;
                }
                const sameRow = SudokuGenerator.rowOf(index) === SudokuGenerator.rowOf(other);
                const sameCol = SudokuGenerator.colOf(index) === SudokuGenerator.colOf(other);
                const sameBox = SudokuGenerator.boxOf(index) === SudokuGenerator.boxOf(other);
                if (sameRow === true || sameCol === true || sameBox === true) {
                    conflicts.add(index);
                    conflicts.add(other);
                }
            }
        }
        return conflicts;
    }
}
//# sourceMappingURL=game-state.js.map