import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/**
 * 批量重排 Course 下 Page 顺序（开发文档 §5.1.2，2026-10-19 新增）。
 * 供左侧课程树拖拽排序调用。
 */
export class ReorderPagesDto {
  /**
   * 该 Course 全部 Page id 的目标顺序（一个完整排列）。
   * 必须无重复、且集合等于该 Course 现有全部 Page id，否则 400 VALIDATION_ERROR。
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds!: string[];
}
