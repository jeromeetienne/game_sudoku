export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Puzzle = {
	readonly given: ReadonlyArray<number>;
	readonly solution: ReadonlyArray<number>;
};

const CELL_COUNT = 81;

/** Number of clues (pre-filled cells) left on the board; fewer clues = harder. */
const CLUES_BY_DIFFICULTY: Record<Difficulty, number> = {
	easy: 40,
	medium: 33,
	hard: 28,
	expert: 24,
};

export class SudokuGenerator {
	/**
	 * Builds a puzzle with a unique solution for the given difficulty.
	 * @param difficulty Target difficulty, controlling how many clues remain.
	 * @returns The revealed clues and the full solution.
	 */
	static generate(difficulty: Difficulty): Puzzle {
		const solution = SudokuGenerator.createSolvedGrid();
		const given = SudokuGenerator.removeCells(solution, CLUES_BY_DIFFICULTY[difficulty]);
		return { given, solution };
	}

	/**
	 * @param index Cell index 0..80.
	 * @returns The 0-based row (0..8).
	 */
	static rowOf(index: number): number {
		return Math.floor(index / 9);
	}

	/**
	 * @param index Cell index 0..80.
	 * @returns The 0-based column (0..8).
	 */
	static colOf(index: number): number {
		return index % 9;
	}

	/**
	 * @param index Cell index 0..80.
	 * @returns The 3x3 box index 0..8, numbered left-to-right then top-to-bottom.
	 */
	static boxOf(index: number): number {
		const row = SudokuGenerator.rowOf(index);
		const col = SudokuGenerator.colOf(index);
		return Math.floor(row / 3) * 3 + Math.floor(col / 3);
	}

	/**
	 * Produces a random, fully solved 9x9 grid.
	 * @returns 81 values in row-major order, all 1..9.
	 */
	private static createSolvedGrid(): number[] {
		const grid = new Array<number>(CELL_COUNT).fill(0);
		SudokuGenerator.fill(grid);
		return grid;
	}

	/**
	 * Backtracking fill of an empty grid: fill the first empty cell with a
	 * shuffled candidate, recurse, and undo on dead ends. Shuffling yields a
	 * different valid grid each run.
	 * @param grid Grid mutated in place; 0 marks an empty cell.
	 * @returns True once every cell is filled, false if no candidate fits.
	 */
	private static fill(grid: number[]): boolean {
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

	/**
	 * Carves a puzzle out of a solved grid by blanking cells in random order
	 * until the target clue count is reached. A cell is only removed if the
	 * puzzle still has exactly one solution, otherwise it is restored.
	 * @param solution The fully solved grid to carve from.
	 * @param clues Number of clues to leave on the board.
	 * @returns The puzzle grid with removed cells set to 0.
	 */
	private static removeCells(solution: ReadonlyArray<number>, clues: number): number[] {
		const given = solution.slice();
		const order = SudokuGenerator.shuffle(
			Array.from({ length: CELL_COUNT }, (_, i) => i),
		);
		let remaining = CELL_COUNT;
		for (const index of order) {
			if (remaining <= clues) {
				break;
			}
			const backup = given[index];
			given[index] = 0;
			if (SudokuGenerator.countSolutions(given.slice(), 2) === 1) {
				remaining -= 1;
			} else {
				given[index] = backup;
			}
		}
		return given;
	}

	/**
	 * Counts solutions via backtracking, stopping early once `limit` is reached.
	 * Callers only need to distinguish "unique" from "multiple", so they pass
	 * limit=2.
	 * @param grid Grid mutated in place during search; 0 marks an empty cell.
	 * @param limit Upper bound at which counting short-circuits.
	 * @returns The number of solutions found, capped at `limit`.
	 */
	private static countSolutions(grid: number[], limit: number): number {
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

	/**
	 * Checks whether a value can be placed without repeating in its row, column,
	 * or box. A single loop covers all three: i walks the row, the column, and
	 * (via i/3, i%3) the nine cells of the box.
	 * @param grid Current grid.
	 * @param index Cell index 0..80 to test.
	 * @param value Candidate value 1..9.
	 * @returns True if the placement breaks no Sudoku constraint.
	 */
	private static isSafe(grid: ReadonlyArray<number>, index: number, value: number): boolean {
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

	/**
	 * Fisher-Yates shuffle on a copy, leaving the input untouched.
	 * @param items Array to shuffle.
	 * @returns A new, randomly ordered array.
	 */
	private static shuffle<T>(items: T[]): T[] {
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
