-- Saudi Shield · reference PostgreSQL + PostGIS schema (target deployment).
-- The prototype API uses an in-memory repository with the same shapes.
-- There are deliberately NO columns for threat tracks, trajectories, velocities or impact points.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE alert_level   AS ENUM ('yellow', 'red', 'white');
CREATE TYPE cap_status    AS ENUM ('Actual', 'Exercise', 'System', 'Test', 'Draft');
CREATE TYPE cap_msg_type  AS ENUM ('Alert', 'Update', 'Cancel');
CREATE TYPE alert_state   AS ENUM ('RECEIVED','QUARANTINED','VERIFIED','IN_REVIEW','APPROVED',
                                   'PUBLISHED','CLEARED','CANCELLED','EXPIRED','REJECTED');
CREATE TYPE user_role     AS ENUM ('viewer','operator','approver','publisher','auditor','admin');

CREATE TABLE issuer (
  id            text PRIMARY KEY,               -- e.g. 'DEMO-ISSUER'
  name_en       text NOT NULL,
  name_ar       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issuer_key (
  key_id        text PRIMARY KEY,
  issuer_id     text NOT NULL REFERENCES issuer(id),
  algorithm     text NOT NULL CHECK (algorithm IN ('Ed25519')),
  public_key    bytea NOT NULL,
  valid_from    timestamptz NOT NULL,
  valid_to      timestamptz NOT NULL,
  revoked_at    timestamptz
);

CREATE TABLE warning_area (
  code          text PRIMARY KEY,               -- authority-supplied code
  name_en       text NOT NULL,
  name_ar       text NOT NULL,
  region_code   text NOT NULL,
  geom          geometry(MultiPolygon, 4326) NOT NULL,
  supplied_by   text NOT NULL REFERENCES issuer(id)
);
CREATE INDEX warning_area_geom_idx ON warning_area USING gist (geom);

CREATE TABLE inbound_message (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id     text NOT NULL,
  identifier    text NOT NULL,
  key_id        text NOT NULL,
  payload       jsonb NOT NULL,
  payload_sha256 bytea NOT NULL,
  signature     bytea NOT NULL,
  signature_ok  boolean NOT NULL,
  reason        text,
  received_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer_id, identifier)                -- replay protection
);

CREATE TABLE alert (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_id    uuid NOT NULL REFERENCES inbound_message(id),
  status        cap_status NOT NULL,
  msg_type      cap_msg_type NOT NULL,
  level         alert_level NOT NULL,
  hazard        text NOT NULL,
  instructions  text[] NOT NULL,                -- authority instruction codes
  sent_at       timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  references_id uuid REFERENCES alert(id),
  state         alert_state NOT NULL,
  prepared_by   uuid,
  approved_by   uuid,
  published_by  uuid,
  CONSTRAINT two_person_rule CHECK (approved_by IS NULL OR approved_by <> prepared_by)
);

CREATE TABLE alert_area (
  alert_id      uuid REFERENCES alert(id),
  area_code     text REFERENCES warning_area(code),
  PRIMARY KEY (alert_id, area_code)
);

CREATE TABLE alert_text (
  alert_id      uuid REFERENCES alert(id),
  lang          text NOT NULL,                  -- BCP 47
  variant       text NOT NULL,                  -- 'standard' | 'plain' | 'short'
  headline      text NOT NULL,
  body          text NOT NULL,
  ai_draft      boolean NOT NULL DEFAULT false,
  accepted_by   uuid,
  PRIMARY KEY (alert_id, lang, variant)
);

CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text NOT NULL,
  roles         user_role[] NOT NULL,
  disabled_at   timestamptz
);

CREATE TABLE audit_event (
  seq           bigserial PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  actor         text NOT NULL,
  action        text NOT NULL,
  subject       text,
  detail        jsonb NOT NULL DEFAULT '{}',
  prev_hash     bytea NOT NULL,
  hash          bytea NOT NULL
);
-- Append-only: revoke UPDATE/DELETE from the application role.
-- REVOKE UPDATE, DELETE ON audit_event FROM saudi_shield_app;

CREATE TABLE delivery_stat (
  alert_id      uuid REFERENCES alert(id),
  channel       text NOT NULL,                  -- 'feed' | 'push' | 'partner'
  queued        integer NOT NULL DEFAULT 0,
  sent          integer NOT NULL DEFAULT 0,
  delivered     integer NOT NULL DEFAULT 0,
  opened        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (alert_id, channel)
);

-- Family check-ins: opt-in, minimal, encrypted at rest (column encryption in target).
CREATE TABLE family_circle (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE family_member (
  circle_id     uuid REFERENCES family_circle(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL,                  -- random device-scoped id, no phone number
  display_name_enc bytea NOT NULL,
  consent_at    timestamptz NOT NULL,
  paused        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (circle_id, member_id)
);
CREATE TABLE family_checkin (
  circle_id     uuid,
  member_id     uuid,
  status        text NOT NULL CHECK (status IN ('safe','need_help')),
  at            timestamptz NOT NULL DEFAULT now(),
  -- retention: delete after 72 hours
  FOREIGN KEY (circle_id, member_id) REFERENCES family_member(circle_id, member_id) ON DELETE CASCADE
);
