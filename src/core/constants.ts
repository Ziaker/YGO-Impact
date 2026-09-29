export const SIMULATION_HZ = 20 as const;
export const STEP_MS = 50 as const;
export const CORE_SCHEMA_VERSION = 1 as const;

export const STEP_PIPELINE = [
  "receive_commands",
  "order_commands",
  "validate",
  "confirm_costs",
  "apply_mutations",
  "resolve_triggers_and_chains",
  "check_mandatory_state",
  "update_timers",
  "emit_telemetry",
  "calculate_hash",
] as const;

export type StepPhase = (typeof STEP_PIPELINE)[number];
