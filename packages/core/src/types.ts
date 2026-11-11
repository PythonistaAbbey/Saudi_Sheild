/**
 * Saudi Shield domain types.
 *
 * Safety note: there are deliberately no fields for threat tracks, trajectories,
 * velocities, headings, launch sites or impact points. A warning area is a
 * civil-protection area supplied by the authority, never a computed footprint.
 */

export type Lang = 'ar' | 'en';
export const LANGS: Lang[] = ['ar', 'en'];

/** Official public meanings published by Civil Defense. */
export type AlertLevel = 'yellow' | 'red' | 'white';

/** CAP 1.2 status values. The prototype only ever processes `Exercise`. */
export type CapStatus = 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft';
export type CapMsgType = 'Alert' | 'Update' | 'Cancel';

export type HazardCode =
  | 'aerial_threat'
  | 'sandstorm'
  | 'flash_flood'
  | 'extreme_heat'
  | 'fire'
  | 'earthquake'
  | 'hazmat';

export type InstructionCode =
  | 'SHELTER_INTERIOR_ROOM'
  | 'AVOID_WINDOWS'
  | 'STAY_INDOORS_UNTIL_CLEAR'
  | 'IF_OUTDOORS_SEEK_BUILDING'
  | 'DRIVERS_PULL_OVER'
  | 'DO_NOT_FILM_OR_GATHER'
  | 'DO_NOT_TOUCH_DEBRIS'
  | 'FOLLOW_OFFICIAL_CHANNELS'
  | 'CLOSE_DOORS_WINDOWS'
  | 'LIMIT_OUTDOOR_ACTIVITY'
  | 'AVOID_VALLEYS_FLOODWATER'
  | 'DRINK_WATER_AVOID_SUN'
  | 'RESUME_WITH_CAUTION'
  | 'CALL_EMERGENCY_NUMBER';

export interface LocalizedText {
  ar?: string;
  en?: string;
}

/** The message as an authorised issuer signs it (CAP-inspired). */
export interface IssuerMessage {
  identifier: string;
  sender: string; // issuer id
  sent: string; // ISO 8601
  status: CapStatus;
  msgType: CapMsgType;
  references?: string[]; // identifiers of earlier messages
  level: AlertLevel;
  hazard: HazardCode;
  areas: string[]; // authority-supplied area codes
  instructions: InstructionCode[];
  expires: string; // ISO 8601
  /** Optional free text from the authority. Rendered only after review. */
  note?: LocalizedText;
}

export interface SignedEnvelope<T = IssuerMessage> {
  payload: T;
  keyId: string;
  /** Hex-encoded Ed25519 signature over canonical JSON of payload. */
  signature: string;
}

export interface Issuer {
  id: string;
  name: LocalizedText & { ar: string; en: string };
}

export interface IssuerKey {
  keyId: string;
  issuerId: string;
  algorithm: 'Ed25519';
  publicKeyHex: string;
  validFrom: string;
  validTo: string;
  revokedAt?: string;
}

export type VerificationCode =
  | 'OK'
  | 'UNKNOWN_KEY'
  | 'KEY_NOT_YET_VALID'
  | 'KEY_EXPIRED'
  | 'KEY_REVOKED'
  | 'ISSUER_MISMATCH'
  | 'BAD_SIGNATURE'
  | 'CLOCK_SKEW'
  | 'MALFORMED';

export interface VerificationResult {
  ok: boolean;
  code: VerificationCode;
  keyId: string;
  issuerId?: string;
  payloadSha256: string;
  checkedAt: string;
}

export type AlertState =
  | 'RECEIVED'
  | 'QUARANTINED'
  | 'VERIFIED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'CLEARED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface RenderedText {
  headline: string;
  body: string;
  steps: string[];
}

export type FindingSeverity = 'blocking' | 'warning' | 'info';
export interface Finding {
  code: string;
  severity: FindingSeverity;
  message: LocalizedText & { en: string; ar: string };
}

export interface AssistSuggestion {
  kind: 'plain_language' | 'short_form' | 'screen_reader' | 'note_translation' | 'summary';
  lang: Lang;
  text: string;
  aiDraft: true;
  provider: string;
  accepted?: { by: string; at: string };
}

export interface HistoryEntry {
  state: AlertState;
  at: string;
  by: string;
  note?: string;
}

export interface AlertRecord {
  id: string;
  envelope: SignedEnvelope;
  message: IssuerMessage;
  verification: VerificationResult;
  state: AlertState;
  texts: Record<Lang, RenderedText>;
  suggestions: AssistSuggestion[];
  findings: Finding[];
  preparedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  publishedAt?: string;
  closedAt?: string;
  /** id of the alert this one updates, clears or cancels */
  supersedes?: string;
  supersededBy?: string;
  retraction?: { requestedBy: string; reason: string; at: string };
  history: HistoryEntry[];
}

/** What the public feed carries. Signed by the platform publishing key. */
export interface PublicAlert {
  id: string;
  identifier: string;
  status: CapStatus;
  issuer: Issuer;
  level: AlertLevel;
  hazard: HazardCode;
  areas: string[];
  instructions: InstructionCode[];
  texts: Record<Lang, RenderedText>;
  plain?: Partial<Record<Lang, string>>;
  issuedAt: string;
  updatedAt: string;
  expires: string;
  publicState: 'active' | 'superseded' | 'cleared' | 'cancelled' | 'expired';
  references?: string[];
}

export interface PublicFeed {
  generatedAt: string;
  environment: 'EXERCISE';
  alerts: SignedEnvelope<PublicAlert>[];
}

export interface WarningArea {
  code: string;
  name: LocalizedText & { ar: string; en: string };
  regionCode: string;
  /** Ring of [lon, lat] pairs. Coarse fictional exercise shapes. */
  polygon: [number, number][];
}

export interface Region {
  code: string;
  name: LocalizedText & { ar: string; en: string };
  cities: { code: string; name: LocalizedText & { ar: string; en: string }; lonLat: [number, number] }[];
}
