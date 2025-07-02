import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');
  
  // Body parser middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    // Only log the body for non-GET requests
    const bodyLog = req.method !== 'GET' ? ` - Body: ${JSON.stringify(req.body)}` : '';
    logger.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}${bodyLog}`);
    
    // Log response when it's sent
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.log(`[${new Date().toISOString()}] Response ${res.statusCode} - Duration: ${duration}ms`);
    });
    
    next();
  });
  
  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
