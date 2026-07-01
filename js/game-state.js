import { SudokuGenerator } from './sudoku-generator.js';
const CELL_COUNT = 81;
export class GameState {
    constructor(difficulty) {
        this.difficulty = difficulty;
        this.puzzle = SudokuGenerator.generate(difficulty);
        this.values = this.puzzle.given.slice();
        this.notes = Array.from({ length: CELL_COUNT }, () => new Set());
        this.selectedIndex = -1;
    }
    getDifficulty() {
        return this.difficulty;
    }
    newGame(difficulty) {
        this.difficulty = difficulty;
        this.puzzle = SudokuGenerator.generate(difficulty);
        this.values = this.puzzle.given.slice();
        this.notes = Array.from({ length: CELL_COUNT }, () => new Set());
        this.selectedIndex = -1;
    }
    select(index) {
        this.selectedIndex = index;
    }
    getSelected() {
        return this.selectedIndex;
    }
    isGiven(index) {
        return this.puzzle.given[index] !== 0;
    }
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
    clear() {
        const index = this.selectedIndex;
        if (index < 0 || this.isGiven(index) === true) {
            return;
        }
        this.values[index] = 0;
        this.notes[index].clear();
    }
    revealHint() {
        const index = this.selectedIndex;
        if (index < 0 || this.isGiven(index) === true) {
            return false;
        }
        this.values[index] = this.puzzle.solution[index];
        this.notes[index].clear();
        return true;
    }
    remainingForValue(value) {
        let used = 0;
        for (let i = 0; i < CELL_COUNT; i += 1) {
            if (this.values[i] === value) {
                used += 1;
            }
        }
        return 9 - used;
    }
    isSolved() {
        for (let i = 0; i < CELL_COUNT; i += 1) {
            if (this.values[i] !== this.puzzle.solution[i]) {
                return false;
            }
        }
        return true;
    }
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
        return 'filled';
    }
    isPeer(index) {
        if (this.selectedIndex < 0 || index === this.selectedIndex) {
            return false;
        }
        const sameRow = SudokuGenerator.rowOf(index) === SudokuGenerator.rowOf(this.selectedIndex);
        const sameCol = SudokuGenerator.colOf(index) === SudokuGenerator.colOf(this.selectedIndex);
        const sameBox = SudokuGenerator.boxOf(index) === SudokuGenerator.boxOf(this.selectedIndex);
        return sameRow === true || sameCol === true || sameBox === true;
    }
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