-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 
 
-- ROLE
-- Manageable roles reflecting actual app roles.
-- is_superuser: bypasses all station/permission checks (Dr. Jahlas).
-- is_global_evaluator: has evaluator + instructor access to all
--   stations always, without needing evaluator_assignment rows
--   (Leadership).
-- Adding or renaming a role is a row change, not a migration.
CREATE TABLE role (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL UNIQUE,
  description         TEXT,
  is_superuser        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_global_evaluator BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
 
-- USER
-- role_id references the role table.
-- A user can gain evaluator access via evaluator_assignment
-- without changing their base role here.
CREATE TABLE "user" (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL UNIQUE,
  role_id      UUID        NOT NULL REFERENCES role(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
 
-- USER_CREDENTIAL
-- Stores Google OAuth credentials per user.
-- One row per provider (supports adding more providers later).
-- access_token / refresh_token only needed if making Google
-- API calls on the user's behalf — omit if not required.
CREATE TABLE user_credential (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider         TEXT        NOT NULL DEFAULT 'google',
  provider_id      TEXT        NOT NULL,
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);
 
 
-- STATION
-- Configurable stations students progress through.
-- order_index controls display order but does not enforce
-- a required traversal sequence.
CREATE TABLE station (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  order_index  INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
 
-- STATION_STATUS
-- Global status labels shared across all stations.
-- is_passing flags which statuses count as "passed" for
-- evaluator promotion logic.
-- Default labels: Not started, Developing, Satisfactory, Exemplary
CREATE TABLE station_status (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT        NOT NULL UNIQUE,
  sort_order   INT         NOT NULL DEFAULT 0,
  is_passing   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
 -- RUBRIC
-- One rubric per station. Contains a text description of what
-- the evaluator should look for — not a scored checklist.
-- Dr. Jahlas can edit the description at any time.
CREATE TABLE rubric (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id   UUID        NOT NULL UNIQUE REFERENCES station(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID        REFERENCES "user"(id)
);
 
 
-- EVALUATOR_ASSIGNMENT
-- Controls which users can evaluate which stations.
-- Inserting a row here grants a student evaluator access
-- to that station (e.g. after passing stations 1, 2, and 3,
-- or via manual instructor override).
-- assigned_by records which instructor granted access.
CREATE TABLE evaluator_assignment (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id   UUID        NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_by  UUID        NOT NULL REFERENCES "user"(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, user_id)
);
 
-- EVALUATION_ATTEMPT
-- Every time a band member is evaluated at a station.
-- Multiple attempts per band member per station are supported.
-- status_id is the evaluator's grade pick from station_status.
-- notes captures the evaluator's written feedback.
CREATE TABLE evaluation_attempt (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  evaluator_id   UUID        NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  station_id     UUID        NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  status_id      UUID        NOT NULL REFERENCES station_status(id),
  notes          TEXT,
  evaluated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
 
-- STUDENT_STATION_PROGRESS
-- Denormalized summary of each student's current status
-- at each station. Updated after every evaluation attempt
-- or by an instructor override.
-- updated_by references the user who last changed the status.
CREATE TABLE student_station_progress (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  station_id        UUID        NOT NULL REFERENCES station(id) ON DELETE CASCADE,
  current_status_id UUID        NOT NULL REFERENCES station_status(id),
  last_attempt_id   UUID        REFERENCES evaluation_attempt(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID        NOT NULL REFERENCES "user"(id),
  UNIQUE (student_id, station_id)
);
 
 -- INDEXES
 
CREATE INDEX idx_user_role                   ON "user" (role_id);
CREATE INDEX idx_user_credential_user        ON user_credential (user_id);
CREATE INDEX idx_rubric_station              ON rubric (station_id);
CREATE INDEX idx_eval_assignment_station     ON evaluator_assignment (station_id);
CREATE INDEX idx_eval_assignment_user        ON evaluator_assignment (user_id);
CREATE INDEX idx_eval_assignment_assigned_by ON evaluator_assignment (assigned_by);
CREATE INDEX idx_eval_attempt_student        ON evaluation_attempt (student_id);
CREATE INDEX idx_eval_attempt_evaluator      ON evaluation_attempt (evaluator_id);
CREATE INDEX idx_eval_attempt_station        ON evaluation_attempt (station_id);
CREATE INDEX idx_progress_student            ON student_station_progress (student_id);
CREATE INDEX idx_progress_station            ON student_station_progress (station_id);


-- HMB Specific values

-- roles
INSERT INTO role (name, description, is_superuser, is_global_evaluator) VALUES
  ('band_member', 'Basic checklist access, can be evaluated',      FALSE, FALSE),
  ('evaluator',   'Can evaluate band members at assigned stations', FALSE, FALSE),
  ('instructor',  'Can view full rubric, gated by own VTC status',  FALSE, FALSE),
  ('leadership',  'Evaluator + instructor access to all stations',  FALSE, TRUE),
  ('director',    'Full access; rubric edits, manual overrides',    TRUE,  TRUE);

-- stations
INSERT INTO station (name, order_index) VALUES
  ('Station 1', 1),
  ('Station 2', 2),
  ('Station 3', 3),
  ('Station 4', 4),
  ('Station 5', 5),
  ('Station 6', 6);

-- station statuses
INSERT INTO station_status (label, sort_order, is_passing) VALUES
  ('Not started', 0, FALSE),
  ('Developing',  1, FALSE),
  ('Proficient',  2, TRUE),
  ('Mastery',     3, TRUE);