import { SubmitScorePayload } from "@/types";

/**
 * Anti-cheat / sanity checks (brief section 25 & 48): the server never
 * trusts a submitted score at face value. Each game defines a plausibility
 * check based on the metadata it reports about the match. This isn't a full
 * anti-cheat system, but it stops the obvious cases (impossible scores,
 * impossibly short matches, invalid win claims) from ever reaching stats.
 */

const MIN_MS_PER_SNAKE_FOOD = 150; // fastest a human could plausibly react
const MAX_SNAKE_SCORE_PER_MS = 1 / MIN_MS_PER_SNAKE_FOOD;

export function validateScore(payload: SubmitScorePayload): { ok: true } | { ok: false; reason: string } {
  const { gameSlug, score, durationMs, metadata } = payload;

  if (score < 0 || !Number.isFinite(score)) return { ok: false, reason: "Invalid score." };
  if (durationMs < 0 || durationMs > 1000 * 60 * 60 * 6) return { ok: false, reason: "Invalid duration." };

  if (gameSlug === "snake") {
    const foodEaten = Number((metadata as any)?.foodEaten ?? 0);
    // Each food item is worth 10 points in the Snake implementation.
    if (score !== foodEaten * 10) {
      return { ok: false, reason: "Score does not match food eaten." };
    }
    // A perfect-reflex player still can't eat food faster than this rate.
    if (durationMs > 0 && score > 0 && score / durationMs > MAX_SNAKE_SCORE_PER_MS * 10) {
      return { ok: false, reason: "Score achieved too quickly." };
    }
    return { ok: true };
  }

  if (gameSlug === "connect4") {
    const board = (metadata as any)?.board as (0 | 1 | 2)[][] | undefined;
    const winner = (metadata as any)?.winner as 0 | 1 | 2 | undefined;
    if (!board || !Array.isArray(board)) return { ok: false, reason: "Missing board state." };
    const recomputed = recomputeConnect4Winner(board);
    if (recomputed !== winner) {
      return { ok: false, reason: "Board state does not support claimed result." };
    }
    return { ok: true };
  }

  return { ok: true };
}

/** Recomputes the Connect 4 winner independently from the raw board, so the
 * client's claimed `result` can't be trusted on its own. 0 = empty, 1 =
 * player, 2 = CPU. */
function recomputeConnect4Winner(board: (0 | 1 | 2)[][]): 0 | 1 | 2 {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const player = board[r][c];
      if (player === 0) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && board[rr][cc] === player) {
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
