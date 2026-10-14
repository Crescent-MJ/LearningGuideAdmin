import { PartialType } from '@nestjs/mapped-types';
import { CreatePageDto } from './create-page.dto';

/** 更新 Page：标题、contentMd、tags、排序均可选（§5.1.3 PUT /api/pages/:id） */
export class UpdatePageDto extends PartialType(CreatePageDto) {}
