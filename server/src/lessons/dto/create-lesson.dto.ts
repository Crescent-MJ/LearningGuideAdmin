import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** 创建 Lesson（开发文档 §5.1.2、§2 Lesson 模型） */
export class CreateLessonDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  /** 视频/内容预计时长（秒） */
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  /** 排序权重；缺省时追加到末尾（服务端按现有数量计算） */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
