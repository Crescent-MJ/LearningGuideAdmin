import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { PortalSourceService } from './portal-source.service';
import { SyncService } from './sync.service';

@Module({
  controllers: [SyncController],
  providers: [SyncService, PortalSourceService],
})
export class SyncModule {}
