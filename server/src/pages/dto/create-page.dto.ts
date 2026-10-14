import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** 创建 Page（开发文档 §5.1.3、§2 Page 模型） */
export class CreatePageDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  /** 核心 Markdown 内容，支持 LaTeX（KaTeX 渲染由前端负责） */
  @IsString()
  contentMd!: string;

  /** 标签数组，如 ["Core Knowledge", "Teaching Guidance"] */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** 排序权重；缺省时追加到末尾 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
