import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 客户端单例（开发文档 §7 Phase 2 第 3 项）。
 * 全应用仅此一处实例化 PrismaClient，由全局 PrismaModule 提供，禁止在别处 new PrismaClient()。
 * 连接池由 Prisma 内部管理（§9.4 数据库连接使用连接池）。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** 模块初始化时建立数据库连接 */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** 模块销毁时释放连接 */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
