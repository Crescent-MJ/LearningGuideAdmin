import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/** 上传文档建页的附加字段（multipart text 部分，§3.2.3/§5.1.6） */
export class UploadFileDto {
  @IsString()
  @IsNotEmpty({ message: 'lessonId 为必填项' })
  @IsUUID(undefined, { message: 'lessonId 须为合法 UUID' })
  lessonId!: string;
}
