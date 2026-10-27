-- =====================================================================
-- TaskFlow initial schema
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
CREATE TYPE user_role      AS ENUM ('admin', 'manager', 'member');
CREATE TYPE project_status AS ENUM ('active', 'archived');
CREATE TYPE task_status    AS ENUM ('todo', 'in_progress', 'in_review', 'done');
CREATE TYPE task_priority  AS ENUM ('low', 'medium', 'high', 'urgent');

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(120) NOT NULL,
  role           user_role    NOT NULL DEFAULT 'member',
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE UNIQUE INDEX users_email_key   ON users (email);
CREATE INDEX        users_role_idx    ON users (role);
CREATE INDEX        users_created_idx ON users (created_at DESC);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150)   NOT NULL,
  description  TEXT,
  status       project_status NOT NULL DEFAULT 'active',
  owner_id     UUID           NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX projects_owner_idx   ON projects (owner_id);
CREATE INDEX projects_status_idx  ON projects (status);
CREATE INDEX projects_created_idx ON projects (created_at DESC);

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- project_members (many-to-many users <-> projects)
-- ---------------------------------------------------------------------
CREATE TABLE project_members (
  project_id  UUID        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX project_members_user_idx ON project_members (user_id);

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID          NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT,
  status       task_status   NOT NULL DEFAULT 'todo',
  priority     task_priority NOT NULL DEFAULT 'medium',
  assignee_id  UUID          REFERENCES users (id) ON DELETE SET NULL,
  created_by   UUID          REFERENCES users (id) ON DELETE SET NULL,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX tasks_project_status_idx ON tasks (project_id, status);
CREATE INDEX tasks_project_created_idx ON tasks (project_id, created_at DESC);
CREATE INDEX tasks_assignee_status_idx ON tasks (assignee_id, status);
CREATE INDEX tasks_due_open_idx        ON tasks (due_date) WHERE status <> 'done';

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep completed_at in sync with status
CREATE OR REPLACE FUNCTION tasks_set_completed_at() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at
  BEFORE INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_set_completed_at();
