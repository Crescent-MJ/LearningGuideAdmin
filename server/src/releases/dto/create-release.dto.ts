import { IsNotEmpty, IsString } from 'class-validator';

/** 发布 Release 快照（开发文档 §5.1.4：revisionNotes 必填） */
export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty({ message: 'revisionNotes 为必填项' })
  revisionNotes!: string;
}
