import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 全局 Prisma 模块（开发文档 §7 Phase 2 第 3 项）。
 * @Global() 导出 PrismaService，业务模块无需重复 import 即可注入单例。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
