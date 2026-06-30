const CELL_COUNT = 81;
const CLUES_BY_DIFFICULTY = {
    easy: 40,
    medium: 33,
    hard: 28,
    expert: 24,
};
export class SudokuGenerator {
    static generate(difficulty) {
        const solution = SudokuGenerator.createSolvedGrid();
        const given = SudokuGenerator.removeCells(solution, CLUES_BY_DIFFICULTY[difficulty]);
        return { given, solution };
    }
    static rowOf(index) {
        return Math.floor(index / 9);
    }
    static colOf(index) {
        return index % 9;
    }
    static boxOf(index) {
        const row = SudokuGenerator.rowOf(index);
        const col = SudokuGenerator.colOf(index);
        return Math.floor(row / 3) * 3 + Math.floor(col / 3);
    }
    static createSolvedGrid() {
        const grid = new Array(CELL_COUNT).fill(0);
        SudokuGenerator.fill(grid);
        return grid;
    }
    static fill(grid) {
        const index = grid.indexOf(0);
        if (index === -1) {
            return true;
        }
        const candidates = SudokuGenerator.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const value of candidates) {
            if (SudokuGenerator.isSafe(grid, index, value) === true) {
                grid[index] = value;
                if (SudokuGenerator.fill(grid) === true) {
                    return true;
                }
                grid[index] = 0;
            }
        }
        return false;
    }
    static removeCells(solution, clues) {
        const given = solution.slice();
        const order = SudokuGenerator.shuffle(Array.from({ length: CELL_COUNT }, (_, i) => i));
        let remaining = CELL_COUNT;
        for (const index of order) {
            if (remaining <= clues) {
                break;
            }
            const backup = given[index];
            given[index] = 0;
            if (SudokuGenerator.countSolutions(given.slice(), 2) === 1) {
                remaining -= 1;
            }
            else {
                given[index] = backup;
            }
        }
        return given;
    }
    static countSolutions(grid, limit) {
        const index = grid.indexOf(0);
        if (index === -1) {
            return 1;
        }
        let count = 0;
        for (let value = 1; value <= 9; value += 1) {
            if (SudokuGenerator.isSafe(grid, index, value) === true) {
                grid[index] = value;
                count += SudokuGenerator.countSolutions(grid, limit);
                grid[index] = 0;
                if (count >= limit) {
                    return count;
                }
            }
        }
        return count;
    }
    static isSafe(grid, index, value) {
        const row = SudokuGenerator.rowOf(index);
        const col = SudokuGenerator.colOf(index);
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 9; i += 1) {
            if (grid[row * 9 + i] === value) {
                return false;
            }
            if (grid[i * 9 + col] === value) {
                return false;
            }
            const boxIndex = (boxRow + Math.floor(i / 3)) * 9 + (boxCol + (i % 3));
            if (grid[boxIndex] === value) {
                return false;
            }
        }
        return true;
    }
    static shuffle(items) {
        const result = items.slice();
        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    }
}
//# sourceMappingURL=sudoku-generator.js.map