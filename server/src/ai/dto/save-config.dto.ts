import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** PUT /api/ai/config 请求体（§4.2.5 / §5.2） */
export class SaveAiConfigDto {
  @IsUUID()
  courseId!: string;

  @IsString()
  @IsIn(['openrouter'])
  llmProvider!: string;

  @IsString()
  @MaxLength(100)
  llmModel!: string;

  /** 自定义 System Prompt（优先级高于模板）；显式传空字符串表示清除 */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  customSystemPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customWelcomeMsg?: string;

  /**
   * 课程级 API Key 明文（仅入参方向）：服务端立即加密存储；
   * 省略 = 保持原值不变；空字符串 = 清除（回退 env 全局 key）。
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}
