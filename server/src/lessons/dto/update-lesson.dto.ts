import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';

/** 更新 Lesson：字段全部可选（§5.1.2 PUT /api/lessons/:id） */
export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
