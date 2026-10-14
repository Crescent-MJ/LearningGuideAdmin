import { IsInt, Min } from 'class-validator';

/** 调整 Lesson 排序（§5.1.2 PUT /api/lessons/:id/reorder） */
export class ReorderLessonDto {
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
