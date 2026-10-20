import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/** 切换激活版本（开发文档 §5.1.4：body { releaseId }，§3.4.2） */
export class ActivateReleaseDto {
  @IsString()
  @IsNotEmpty({ message: 'releaseId 为必填项' })
  @IsUUID()
  releaseId!: string;
}
