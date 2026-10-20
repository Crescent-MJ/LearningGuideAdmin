import { IsBoolean } from 'class-validator';

/** PUT /api/ai/config/:courseId/online 请求体（§4.2.6 / §5.2，2026-10-20） */
export class SetOnlineDto {
  /** true = 该课程 AI Tutor 对用户侧开放（Online） */
  @IsBoolean()
  online!: boolean;
}
