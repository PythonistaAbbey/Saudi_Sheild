import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import type { Response } from 'express';
import { WorkflowError, SafetyBoundaryError } from '@saudi-shield/core';
import { AuthGuard } from './auth';
import { AlertsController, AuthController, OpsController, PublicController, SimulatorController } from './controllers';
import { PlatformService } from './platform.service';

const STATUS: Record<string, number> = { FORBIDDEN: 403, NOT_FOUND: 404 };

@Catch(WorkflowError, SafetyBoundaryError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(err: WorkflowError | SafetyBoundaryError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(STATUS[err.code] ?? 409).json({ error: err.code, message: err.message });
  }
}

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(err: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = err.getResponse();
    res.status(err.getStatus()).json({ error: err.name, message: typeof body === 'string' ? body : (body as { message?: string }).message });
  }
}

@Module({
  controllers: [AuthController, AlertsController, OpsController, SimulatorController, PublicController],
  providers: [
    PlatformService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
