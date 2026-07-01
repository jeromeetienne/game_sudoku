export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Puzzle = {
	readonly given: ReadonlyArray<number>;
	readonly solution: ReadonlyArray<number>;
};

const CELL_COUNT = 81;

const CLUES_BY_DIFFICULTY: Record<Difficulty, number> = {
	easy: 40,
	medium: 33,
	hard: 28,
	expert: 24,
};

export class SudokuGenerator {
	static generate(difficulty: Difficulty): Puzzle {
		const solution = SudokuGenerator.createSolvedGrid();
		const given = SudokuGenerator.removeCells(solution, CLUES_BY_DIFFICULTY[difficulty]);
		return { given, solution };
	}

	static rowOf(index: number): number {
		return Math.floor(index / 9);
	}

	static colOf(index: number): number {
		return index % 9;
	}

	static boxOf(index: number): number {
		const row = SudokuGenerator.rowOf(index);
		const col = SudokuGenerator.colOf(index);
		return Math.floor(row / 3) * 3 + Math.floor(col / 3);
	}

	private static createSolvedGrid(): number[] {
		const grid = new Array<number>(CELL_COUNT).fill(0);
		SudokuGenerator.fill(grid);
		return grid;
	}

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
