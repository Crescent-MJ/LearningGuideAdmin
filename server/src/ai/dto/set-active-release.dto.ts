import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/** PUT /api/ai/config/:courseId/active-release 请求体（§5.2，2026-10-20 新增） */
export class SetActiveReleaseDto {
  /** 「测试所选 Release」的 id（须属于该 Course） */
  @IsString()
  @IsUUID()
  @IsNotEmpty({ message: 'releaseId 为必填项' })
  releaseId!: string;
}
