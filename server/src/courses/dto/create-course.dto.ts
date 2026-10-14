import { IsOptional, IsString, MaxLength } from 'class-validator';

/** 创建 Course（开发文档 §5.1.1、§2 Course 模型） */
export class CreateCourseDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** 对应外部同步源的 ID（§2） */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string;
}
