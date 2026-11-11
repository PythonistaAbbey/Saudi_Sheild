import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Res, Sse } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import {
  DEMO_USERS,
  REGIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  WARNING_AREAS,
  can,
  verifyChain,
  type Actor,
  type AlertRecord,
  type SignedEnvelope,
} from '@saudi-shield/core';
import { CurrentActor, Public, RequirePermission, issueToken } from './auth';
import { PlatformService } from './platform.service';

/** Strip the raw envelope signature for list views; keep full detail for the workspace. */
function summary(r: AlertRecord) {
  return {
    id: r.id,
    identifier: r.message.identifier,
    state: r.state,
    level: r.message.level,
    hazard: r.message.hazard,
    msgType: r.message.msgType,
    status: r.message.status,
    areas: r.message.areas,
    headline: { ar: r.texts.ar.headline, en: r.texts.en.headline },
    receivedAt: r.history[0].at,
    updatedAt: r.history[r.history.length - 1].at,
    verification: r.verification,
    blocking: r.findings.filter((f) => f.severity === 'blocking').length,
    preparedBy: r.preparedBy,
    approvedBy: r.approvedBy,
    publishedBy: r.publishedBy,
    supersedes: r.supersedes,
    supersededBy: r.supersededBy,
    retraction: r.retraction,
  };
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly svc: PlatformService) {}

  @Public()
  @Get('users')
  users() {
    return DEMO_USERS;
  }

  @Public()
  @Post('login')
  login(@Body() body: { userId?: string }) {
    const user = body?.userId ? this.svc.user(body.userId) : undefined;
    if (!user) throw new BadRequestException('Unknown demo user.');
    this.svc.platform.audit.append({ at: this.svc.platform.now().toISOString(), actor: user.id, action: 'auth.login', detail: { roles: user.roles } });
    return { token: issueToken(user.id), user };
  }

  @Get('me')
  me(@CurrentActor() actor: Actor) {
    return { user: actor, permissions: [...new Set(actor.roles.flatMap((r) => ROLE_PERMISSIONS[r]))] };
  }
}

@Controller('api/alerts')
export class AlertsController {
  constructor(private readonly svc: PlatformService) {}
  private get p() {
    return this.svc.platform;
  }

  @RequirePermission('alerts.read')
  @Get()
  list(@Query('state') state?: string) {
    const all = this.p.list();
    return (state ? all.filter((r) => state.split(',').includes(r.state)) : all).map(summary);
  }

  @RequirePermission('alerts.read')
  @Get(':id')
  get(@Param('id') id: string) {
    const r = this.p.get(id);
    if (!r) throw new NotFoundException();
    const actorNames = Object.fromEntries(DEMO_USERS.map((u) => [u.id, u.name]));
    return { ...r, actorNames, issuer: this.p.registry.getIssuer(r.message.sender) ?? null };
  }

  @RequirePermission('alerts.prepare')
  @Post(':id/prepare')
  prepare(@Param('id') id: string, @CurrentActor() a: Actor) {
    return this.p.prepare(id, a);
  }

  @RequirePermission('alerts.prepare')
  @Post(':id/suggestions/:index/accept')
  accept(@Param('id') id: string, @Param('index', ParseIntPipe) index: number, @CurrentActor() a: Actor) {
    return this.p.acceptSuggestion(id, a, index);
  }

  @RequirePermission('alerts.approve')
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentActor() a: Actor) {
    return this.p.approve(id, a);
  }

  @RequirePermission('alerts.reject')
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @CurrentActor() a: Actor) {
    if (!body?.reason) throw new BadRequestException('A reason is required.');
    return this.p.reject(id, a, body.reason);
  }

  @RequirePermission('alerts.publish')
  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentActor() a: Actor) {
    return this.p.publish(id, a);
  }

  @RequirePermission('alerts.cancel')
  @Post(':id/retraction/request')
  requestRetraction(@Param('id') id: string, @Body() body: { reason?: string }, @CurrentActor() a: Actor) {
    if (!body?.reason) throw new BadRequestException('A reason is required.');
    return this.p.requestRetraction(id, a, body.reason);
  }

  @RequirePermission('alerts.cancel')
  @Post(':id/retraction/confirm')
  confirmRetraction(@Param('id') id: string, @CurrentActor() a: Actor) {
    return this.p.confirmRetraction(id, a);
  }
}

@Controller('api')
export class OpsController {
  constructor(private readonly svc: PlatformService) {}
  private get p() {
    return this.svc.platform;
  }

  /** Issuers post signed envelopes here. The signature is the authentication. */
  @Public()
  @Post('ingest')
  ingest(@Body() env: SignedEnvelope) {
    const r = this.p.ingest(env);
    return { id: r.id, state: r.state, verification: r.verification };
  }

  @RequirePermission('areas.read')
  @Get('areas')
  areas() {
    const active = this.p.list().filter((r) => r.state === 'PUBLISHED' && !r.supersededBy);
    return {
      regions: REGIONS,
      areas: WARNING_AREAS.map((a) => {
        const alerts = active.filter((r) => r.message.areas.includes(a.code));
        const level = alerts.find((r) => r.message.level === 'red') ? 'red' : alerts.find((r) => r.message.level === 'yellow') ? 'yellow' : alerts.length ? 'white' : null;
        return { ...a, currentLevel: level, alertIds: alerts.map((r) => r.id) };
      }),
    };
  }

  @RequirePermission('stats.read')
  @Get('stats/delivery')
  delivery() {
    const recs = new Map(this.p.list().map((r) => [r.id, r]));
    return this.p.delivery().map((d) => ({ ...d, alert: summary(recs.get(d.alertId)!) }));
  }

  @RequirePermission('health.read')
  @Get('health')
  health() {
    return this.p.health();
  }

  @RequirePermission('audit.read')
  @Get('audit')
  audit() {
    const events = this.p.audit.list();
    return { events: [...events].reverse(), verification: verifyChain(events) };
  }

  @RequirePermission('alerts.read')
  @Get('audit/recent')
  recent() {
    // A reduced view for the overview page: action, time and subject only.
    return [...this.p.audit.list()].slice(-12).reverse().map(({ seq, at, actor, action, subject }) => ({ seq, at, actor, action, subject }));
  }

  @RequirePermission('alerts.read')
  @Get('roles')
  roles() {
    return { roles: ROLE_LABELS, permissions: ROLE_PERMISSIONS, users: DEMO_USERS };
  }

  @RequirePermission('alerts.read')
  @Get('assist/summary')
  assistSummary(@Query('lang') lang: 'ar' | 'en' = 'en', @CurrentActor() a: Actor) {
    if (!can(a, 'assist.use') && !can(a, 'alerts.read')) throw new BadRequestException();
    return this.p.assist.summarise(this.p.list(), lang === 'ar' ? 'ar' : 'en');
  }
}

@Controller('api/simulator')
export class SimulatorController {
  constructor(private readonly svc: PlatformService) {}
  private get p() {
    return this.svc.platform;
  }

  @RequirePermission('alerts.read')
  @Get('scenarios')
  scenarios() {
    return this.svc.scenarios();
  }

  @RequirePermission('simulator.run')
  @Post('run')
  run(@Body() body: { scenarioId: string; stepId: string; runId?: string }, @CurrentActor() a: Actor) {
    const runId = body.runId || this.p.newRunId();
    const r = this.p.runStep(body.scenarioId, body.stepId, runId, a.id);
    return { runId, alert: summary(r) };
  }

  /**
   * Demo autopilot: performs the NEXT workflow step for an alert using distinct
   * fictional staff accounts, so a presenter can walk through the flow quickly.
   * The same rules apply (two-person rule, blocking findings), and every action is audited.
   */
  @RequirePermission('simulator.run')
  @Post('advance/:id')
  advance(@Param('id') id: string, @CurrentActor() a: Actor) {
    const r = this.p.get(id);
    if (!r) throw new NotFoundException();
    const OP = this.svc.user(r.preparedBy === 'u-op-1' ? 'u-op-2' : 'u-op-1')!;
    const AP = this.svc.user('u-ap-1')!;
    const PB = this.svc.user('u-pb-1')!;
    this.p.audit.append({ at: this.p.now().toISOString(), actor: a.id, action: 'simulator.autopilot', subject: id, detail: { from: r.state } });
    switch (r.state) {
      case 'VERIFIED': {
        let prep = this.p.prepare(id, OP);
        prep.suggestions.forEach((s, i) => {
          if (s.kind === 'note_translation' || s.kind === 'plain_language') prep = this.p.acceptSuggestion(id, OP, i);
        });
        return prep;
      }
      case 'IN_REVIEW':
        return this.p.approve(id, AP);
      case 'APPROVED':
        return this.p.publish(id, PB);
      default:
        throw new BadRequestException(`Nothing to advance from ${r.state}.`);
    }
  }

  @RequirePermission('simulator.run')
  @Post('reset')
  reset(@Body() body: { seed?: boolean }) {
    this.svc.reset(body?.seed !== false);
    return { ok: true };
  }
}

@Controller('api/public')
export class PublicController {
  constructor(private readonly svc: PlatformService) {}

  /** Signed public feed for apps. Contains only PUBLISHED alerts, Exercise status only. */
  @Public()
  @Get('feed')
  feed(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.svc.platform.publicFeed();
  }

  @Public()
  @Get('key')
  key() {
    return this.svc.platform.publisherPublicKey();
  }

  /** Server-sent events: a "something changed, fetch the feed" signal. Carries no alert content. */
  @Public()
  @Sse('stream')
  stream(): Observable<{ data: { type: string; at: string } }> {
    return new Observable((sub) => {
      const off = this.svc.platform.on((ev) => sub.next({ data: { type: ev.type, at: new Date().toISOString() } }));
      const ping = setInterval(() => sub.next({ data: { type: 'ping', at: new Date().toISOString() } }), 15_000);
      return () => {
        off();
        clearInterval(ping);
      };
    });
  }
}
