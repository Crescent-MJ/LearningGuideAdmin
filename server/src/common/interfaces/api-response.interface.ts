/**
 * 统一响应格式类型定义（开发文档 §5.3）。
 */

/** 成功响应信封 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  message: string;
}

/** 错误响应信封（绝不包含堆栈、SQL、内部路径，见 §9 安全注意事项） */
export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
  };
}
