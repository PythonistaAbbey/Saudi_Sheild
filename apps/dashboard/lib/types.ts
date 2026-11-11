import type { AlertLevel, AlertRecord, HazardCode, LocalizedText, VerificationResult, WarningArea, Issuer } from '@saudi-shield/core';

export interface AlertSummary {
  id: string;
  identifier: string;
  state: string;
  level: AlertLevel;
  hazard: HazardCode;
  msgType: string;
  status: string;
  areas: string[];
  headline: { ar: string; en: string };
  receivedAt: string;
  updatedAt: string;
  verification: VerificationResult;
  blocking: number;
  preparedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  supersedes?: string;
  supersededBy?: string;
  retraction?: { requestedBy: string; reason: string; at: string };
}

export type AlertDetail = AlertRecord & { actorNames: Record<string, string>; issuer: Issuer | null };

export interface AreasResponse {
  areas: (WarningArea & { currentLevel: AlertLevel | null; alertIds: string[] })[];
  regions: { code: string; name: LocalizedText }[];
}

export interface DeliveryRow {
  alertId: string;
  channels: { channel: string; queued: number; sent: number; delivered: number; opened: number }[];
  safeCheckIns: number;
  alert: AlertSummary;
}

export interface Health {
  generatedAt: string;
  services: { name: string; status: 'ok' | 'degraded' | 'down'; detail: string }[];
  feedFreshnessSec: number;
  lastIssuerMessageAt?: string;
  keys: { keyId: string; issuerId: string; validTo: string; revoked: boolean }[];
  auditChain: { ok: boolean; checked: number; firstBrokenSeq?: number };
}
