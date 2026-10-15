import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

/**
 * 全局异常过滤器（开发文档 §5.3、§7 Phase 2 第 5 项、§9 安全注意事项）。
 * 在 AppModule 中通过 APP_FILTER 全局注册，输出统一错误信封
 * { success: false, data: null, error: { code, message } }。
 *
 * 安全要求：响应体绝不包含堆栈、SQL、内部路径等实现细节；
 * 原始错误（含 stack）仅通过 Logger 写入服务器日志。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      // HttpException 按状态码映射业务错误码
      status = exception.getStatus();
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        // Nest 将 multer 文件超限（§10.1：15MB）统一转为 413，
        // 对外按 §3.2.3 约定映射为 400 校验错误
        status = HttpStatus.BAD_REQUEST;
        code = 'VALIDATION_ERROR';
        message = '文件大小超过 15MB 限制';
      } else {
        code = this.mapHttpStatusToCode(status);
        message = this.extractHttpExceptionMessage(exception);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma 已知错误码映射为合理业务码（不向外暴露 meta/SQL）
      const mapped = this.mapPrismaError(exception.code);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = '数据校验失败';
    }

    // 服务器日志记录原始错误（含堆栈），仅落日志、不进响应
    this.logger.error(
      `请求处理异常: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ApiErrorResponse = {
      success: false,
      data: null,
      error: { code, message },
    };
    response.status(status).json(body);
  }

  /** HTTP 状态码 → 业务错误码（§5.3：400→VALIDATION_ERROR、404→NOT_FOUND，其余按语义） */
  private mapHttpStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return status >= 400 && status < 500
          ? 'BUSINESS_ERROR'
          : 'INTERNAL_ERROR';
    }
  }

  /** 从 HttpException 响应体提取安全消息（字符串或校验消息数组），不回显原始对象 */
  private extractHttpExceptionMessage(exception: HttpException): string {
    const res = exception.getResponse();
    if (typeof res === 'string') {
      return res;
    }
    if (res && typeof res === 'object') {
      const raw = (res as { message?: unknown }).message;
      if (Array.isArray(raw)) {
        return raw.map((m) => String(m)).join('; ');
      }
      if (typeof raw === 'string' && raw.length > 0) {
        return raw;
      }
    }
    // 兜底使用异常自身消息（HttpException 消息为开发者显式声明，非堆栈）
    return exception.message;
  }

  /** Prisma 已知错误码 → 状态码 + 业务码 + 安全消息 */
  private mapPrismaError(
    prismaCode: string,
  ): { status: number; code: string; message: string } {
    switch (prismaCode) {
      case 'P2002': // 唯一约束冲突
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: '数据已存在（唯一约束冲突）',
        };
      case 'P2025': // 记录不存在
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: '请求的资源不存在',
        };
      case 'P2003': // 外键约束失败
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: '关联记录不存在，违反外键约束',
        };
      case 'P2000': // 字段值超长
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: '字段值超出允许长度',
        };
      default:
        // 未知 Prisma 错误：仅记录日志，对外统一内部错误，绝不泄露 meta/SQL
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
        };
    }
  }
}
