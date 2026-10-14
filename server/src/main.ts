import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // PORT 经 ConfigService 读取，缺省 3000（开发文档 §7 Phase 2 第 6 项、§8）
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 3000);
  await app.listen(port);
}

// 启动失败（如 DATABASE_URL 缺失）时明确报错并退出进程
bootstrap().catch((err: unknown) => {
  Logger.error(
    `服务启动失败: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
