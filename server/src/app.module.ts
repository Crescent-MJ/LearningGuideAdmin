import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { validateEnv } from './config/env.validation';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    // 环境变量配置（开发文档 §7 Phase 2 第 6 项、§8）：全局可用，启动时校验 DATABASE_URL
    // 注：envFilePath 相对进程 cwd，须从 server/ 目录启动（npm run start / start:dev / start:prod）
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    // Prisma 客户端单例（§7 Phase 2 第 3 项）
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 统一响应格式（§5.3、§7 Phase 2 第 4 项），SSE 流式接口豁免点见拦截器注释
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局错误处理（§5.3、§7 Phase 2 第 5 项）
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
