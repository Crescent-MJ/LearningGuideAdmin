import { PartialType } from '@nestjs/mapped-types';
import { CreatePageDto } from './create-page.dto';

/** 更新 Page：标题、contentMd、sectionTags、排序均可选（§5.1.2 PUT /api/pages/:id） */
export class UpdatePageDto extends PartialType(CreatePageDto) {}
