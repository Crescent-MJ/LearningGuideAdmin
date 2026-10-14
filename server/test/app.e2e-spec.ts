import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/app-setup';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // 与 main.ts 相同的全局设置（/api 前缀 + ValidationPipe）
    configureApp(app);
    await app.init();
  });

  it('/api (GET) 应返回 §5.3 统一响应格式 JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api').expect(200);
    expect(res.body).toEqual({
      success: true,
      data: 'Hello World!',
      error: null,
      message: '操作成功',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
