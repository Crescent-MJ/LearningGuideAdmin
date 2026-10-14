import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * 应用级公共设置（开发文档 §5.1：全部接口挂 /api 前缀；§9.3：输入校验）。
 * main.ts 与 e2e 测试共用，保证运行与测试行为一致。
 */
export function configureApp(app: INestApplication): void {
  // §5.1 所有知识库/AI 接口路径均以 /api 开头
  app.setGlobalPrefix('api');
  // §9.3 输入校验：DTO 白名单过滤 + 类型转换，未通过校验由全局过滤器输出 400 VALIDATION_ERROR
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
}
