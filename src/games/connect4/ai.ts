import { Difficulty } from "@/types";

export type Cell = 0 | 1 | 2; // 0 empty, 1 player, 2 CPU
export type Board = Cell[][]; // [row][col], row 0 = top

export const ROWS = 6;
export const COLS = 7;

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function getValidColumns(board: Board): number[] {
  return Array.from({ length: COLS }, (_, c) => c).filter((c) => board[0][c] === 0);
}

/** Drops a piece and returns the row it landed on, or -1 if the column is full. */
export function dropPiece(board: Board, col: number, player: Cell): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      return r;
    }
  }
  return -1;
}

export function checkWinner(board: Board): Cell {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const player = board[r][c];
      if (player === 0) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === player) {
          count++;
          rr += dr;
          cc += dc;
        }
        if (count >= 4) return player;
      }
    }
  }
  return 0;
}

export function isBoardFull(board: Board): boolean {
  return board[0].every((c) => c !== 0);
}

function scoreWindow(window: Cell[], player: Cell): number {
  const opponent: Cell = player === 1 ? 2 : 1;
  const countP = window.filter((c) => c === player).length;
  const countO = window.filter((c) => c === opponent).length;
  const countE = window.filter((c) => c === 0).length;

  if (countP === 4) return 100;
  if (countP === 3 && countE === 1) return 5;
  if (countP === 2 && countE === 2) return 2;
  if (countO === 3 && countE === 1) return -4;
  return 0;
}

function heuristic(board: Board, player: Cell): number {
  let score = 0;
  // Center column preference
  const centerCol = Math.floor(COLS / 2);
  const centerCount = board.reduce((acc, row) => acc + (row[centerCol] === player ? 1 : 0), 0);
  score += centerCount * 3;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], player);
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], player);
    }
  }
  // Diagonal /
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += scoreWindow(
        [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]],
        player
      );
    }
  }
  // Diagonal \
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      score += scoreWindow(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        player
      );
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  cpu: Cell,
  human: Cell
): { col: number; value: number } {
  const validCols = getValidColumns(board);
  const winner = checkWinner(board);

  if (winner === cpu) return { col: -1, value: 10_000_000 };
  if (winner === human) return { col: -1, value: -10_000_000 };
  if (validCols.length === 0) return { col: -1, value: 0 };
  if (depth === 0) return { col: -1, value: heuristic(board, cpu) };

  let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

  if (maximizing) {
    let value = -Infinity;
    for (const col of validCols) {
      const copy = board.map((row) => [...row]);
      dropPiece(copy, col, cpu);
      const result = minimax(copy, depth - 1, alpha, beta, false, cpu, human);
      if (result.value > value) {
        value = result.value;
        bestCol = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { col: bestCol, value };
  } else {
    let value = Infinity;
    for (const col of validCols) {
      const copy = board.map((row) => [...row]);
      dropPiece(copy, col, human);
      const result = minimax(copy, depth - 1, alpha, beta, true, cpu, human);
      if (result.value < value) {
        value = result.value;
        bestCol = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { col: bestCol, value };
  }
}

const DEPTH_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  normal: 3,
  hard: 5,
};

/** Picks the CPU's move. Easy occasionally plays a random valid column to
 * stay beatable; normal/hard always use minimax at increasing depth. */
export function getCpuMove(board: Board, difficulty: Difficulty, cpu: Cell = 2, human: Cell = 1): number {
  const validCols = getValidColumns(board);
  if (difficulty === "easy" && Math.random() < 0.5) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  const depth = DEPTH_BY_DIFFICULTY[difficulty];
  const { col } = minimax(board, depth, -Infinity, Infinity, true, cpu, human);
  return col === -1 ? validCols[0] : col;
}
