import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/** 允许的预设色板（antd preset color names） */
export const ALLOWED_TAG_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'cyan',
  'gold',
  'magenta',
  'default',
] as const;

/** 更新 Tag 颜色（开发文档 §5.1.6） */
export class UpdateTagDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_TAG_COLORS)
  color!: string;
}
