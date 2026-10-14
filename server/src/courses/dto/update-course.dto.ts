import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';

/** 更新 Course：字段全部可选（§5.1.1 PUT /api/courses/:id） */
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
