import { IsIn } from 'class-validator';

/** POST /api/ai/config/:courseId/reset 请求体（§4.2.4 / §5.2；2026-10-20 二次改拍：带 mode） */
export class ResetAiConfigDto {
  /** 要重置的模式：只清空该模式的自定义覆盖，恢复该模式默认模板 */
  @IsIn(['LECTURE', 'SOCRATIC'])
  mode!: 'LECTURE' | 'SOCRATIC';
}
