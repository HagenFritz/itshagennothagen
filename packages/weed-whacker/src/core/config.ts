export const WORLD_GRID_SIZE = 30
export const STARTING_GRID_SIZE = 5

export const PLAYER_MOVE_COOLDOWN_MS = 150
export const CHOP_COOLDOWN_MS = 1000

export const WEED_SPAWN_CHANCE_PER_TILE_PER_SECOND = 0.02

export const INCOME_PER_TILE_PER_SECOND = 1
export const TILE_BASE_COST = 10
export const TILE_COST_INCREMENT = 1

export const RUN_DURATION_MS = 180_000
export const TIMER_WARNING_MS = 10_000

// 50 divides every cooldown and duration above exactly, so simulated
// time stays integer and cooldowns expire on their precise step.
export const SIM_STEP_MS = 50

export const MAX_SCORE = RUN_DURATION_MS / CHOP_COOLDOWN_MS
