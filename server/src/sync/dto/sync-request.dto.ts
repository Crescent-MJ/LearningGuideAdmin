import { IsString, MaxLength } from 'class-validator';

/** 同步请求体（§3.2.2 / §5.1.5）：指定外部源课程 externalId */
export class SyncRequestDto {
  @IsString()
  @MaxLength(100)
  externalId!: string;
}
