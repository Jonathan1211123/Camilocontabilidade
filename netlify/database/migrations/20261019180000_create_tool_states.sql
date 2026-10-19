CREATE TABLE panel_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE tool_states (
  user_id TEXT NOT NULL REFERENCES panel_users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id),
  CONSTRAINT tool_states_size CHECK (octet_length(state::text) <= 1100000)
);
