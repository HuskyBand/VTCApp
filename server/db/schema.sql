-- VTC Webapp DB Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ROLE
-- Manageable roles reflecting actual app roles.
-- is_superuser: bypasses all permission checks (Dr. Jahlas).
-- is_global_evaluator: permanent evaluator + instructor access
--   to all stations without needing an evaluator row (Leadership).
-- Adding or renaming a role is a row change, not a migration.

CREATE TABLE role (
  role_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL UNIQUE,
  description         TEXT,
  is_superuser        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_global_evaluator BOOLEAN     NOT NULL DEFAULT FALSE
);


-- USER
-- instrument stores the band member's instrument.
-- role_id references the role table.

CREATE TABLE "user" (
  user_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  role_id      UUID        NOT NULL REFERENCES role(role_id),
  instrument   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- USER_CREDENTIAL
-- Taken from claude, probably needs changed based on the system we integrate

CREATE TABLE user_credential (
  user_credential_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  provider            TEXT        NOT NULL DEFAULT 'google',
  provider_id         TEXT        NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,
  token_expires_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);


-- STATION
-- Configurable stations band members progress through.
-- order_index controls display order.

CREATE TABLE station (
  station_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  order_index  INT         NOT NULL DEFAULT 0
);


-- STATUS
-- Global grade labels shared across all stations.
-- is_passing flags which grades count as passed for
-- evaluator promotion logic.
-- Default labels: Not started, Developing, Proficient, Mastery

CREATE TABLE status (
  status_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT        NOT NULL UNIQUE,
  order_index  INT         NOT NULL DEFAULT 0,
  is_passing   BOOLEAN     NOT NULL DEFAULT FALSE
);


-- RUBRIC
-- One rubric per station. Contains a text description of what
-- the evaluator should look for — not a scored checklist.
-- Dr. Jahlas can edit the description at any time.

CREATE TABLE rubric (
  rubric_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id   UUID        NOT NULL UNIQUE REFERENCES station(station_id) ON DELETE CASCADE,
  description  TEXT        NOT NULL
);


-- EVALUATOR
-- Controls which users can evaluate which stations.
-- Inserting a row grants evaluator access to that station,
-- either via auto-promotion or manual instructor override.

CREATE TABLE evaluator (
  evaluator_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  station_id    UUID        NOT NULL REFERENCES station(station_id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, station_id)
);


-- SCORE
-- Every evaluation of a band member at a station.
-- Multiple scores per user per station are supported.
-- status_id is the evaluator's grade pick from status.
-- notes captures the evaluator's written feedback.

CREATE TABLE score (
  score_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  evaluator_id  UUID        REFERENCES "user"(user_id) ON DELETE SET NULL,
  station_id    UUID        NOT NULL REFERENCES station(station_id) ON DELETE CASCADE,
  status_id     UUID        NOT NULL REFERENCES status(status_id),
  notes         TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- PROGRESS
-- Denormalized summary of each band member's current standing
-- at each station. Points to their latest score.
-- Updated after every evaluation or instructor override.

CREATE TABLE progress (
  progress_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  station_id   UUID        NOT NULL REFERENCES station(station_id) ON DELETE CASCADE,
  score_id     UUID        REFERENCES score(score_id) ON DELETE SET NULL,
  UNIQUE (user_id, station_id)
);


-- INDEXES

CREATE INDEX idx_user_role              ON "user" (role_id);
CREATE INDEX idx_user_credential_user   ON user_credential (user_id);
CREATE INDEX idx_rubric_station         ON rubric (station_id);
CREATE INDEX idx_evaluator_user         ON evaluator (user_id);
CREATE INDEX idx_evaluator_station      ON evaluator (station_id);
CREATE INDEX idx_score_user             ON score (user_id);
CREATE INDEX idx_score_evaluator        ON score (evaluator_id);
CREATE INDEX idx_score_station          ON score (station_id);
CREATE INDEX idx_progress_user          ON progress (user_id);
CREATE INDEX idx_progress_station       ON progress (station_id);


-- SEED DATA
-- The station and the scoring standards used in HMB's 2023 season
-- The roles are basic band positions with HMB specific permissions

INSERT INTO role (name, description, is_superuser, is_global_evaluator) VALUES
  ('band_member', 'Basic checklist access, can be evaluated',      FALSE, FALSE),
  ('evaluator',   'Can evaluate band members at assigned stations', FALSE, FALSE),
  ('instructor',  'Can view full rubric, gated by own VTC status',  FALSE, FALSE),
  ('leadership',  'Evaluator + instructor access to all stations',  FALSE, TRUE),
  ('director',    'Full access; rubric edits, manual overrides',    TRUE,  TRUE);

INSERT INTO status (label, order_index, is_passing) VALUES
  ('Not started', 0, FALSE),
  ('Developing',  1, FALSE),
  ('Proficient',  2, TRUE),
  ('Mastery',     3, TRUE);

INSERT INTO station (name, order_index) VALUES
  ('Station 1', 1),
  ('Station 2', 2),
  ('Station 3', 3),
  ('Station 4', 4),
  ('Station 5', 5),
  ('Station 6', 6);