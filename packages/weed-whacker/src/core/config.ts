// The whole world is drawn on screen at once (no camera). 7x7 leaves 40
// tiles to buy beyond the 9-tile start, enough expansion to fill most of
// a 3-minute run.
export const WORLD_GRID_SIZE = 7
export const STARTING_TILE_COUNT = 9

export const PLAYER_MOVE_COOLDOWN_MS = 150
export const CHOP_COOLDOWN_MS = 1000

export const WEED_SPAWN_CHANCE_PER_TILE_PER_SECOND = 0.05

export const INCOME_PER_TILE_PER_SECOND = 1
export const TILE_BASE_COST = 10
// Steeper than +1 so income (which snowballs as the plot grows) does not
// let a player buy out the whole board in the first 20 seconds.
export const TILE_COST_INCREMENT = 5

export const RUN_DURATION_MS = 180_000
export const TIMER_WARNING_MS = 10_000

// 50 divides every cooldown and duration above exactly, so simulated
// time stays integer and cooldowns expire on their precise step.
export const SIM_STEP_MS = 50

export const MAX_SCORE = RUN_DURATION_MS / CHOP_COOLDOWN_MS
