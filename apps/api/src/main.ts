import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:8081').split(',') });
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('X-Environment', 'EXERCISE-ONLY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  return app;
}

if (require.main === module) {
  createApp().then(async (app) => {
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port);
    console.log(`Saudi Shield API (EXERCISE ONLY) listening on http://localhost:${port}`);
  });
}
