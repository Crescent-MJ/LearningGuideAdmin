import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor（§5.3 统一响应格式）', () => {
  const interceptor = new TransformInterceptor();
  const mockContext = {} as ExecutionContext;

  function callWith<T>(data: T) {
    const handler = { handle: () => of(data) } as CallHandler<T>;
    return firstValueFrom(interceptor.intercept(mockContext, handler));
  }

  it('字符串返回值应包装为成功信封', async () => {
    const result = await callWith('Hello World!');
    expect(result).toEqual({
      success: true,
      data: 'Hello World!',
      error: null,
      message: '操作成功',
    });
  });

  it('对象返回值应原样放入 data 字段', async () => {
    const payload = { id: '1', title: '测试课程' };
    const result = await callWith(payload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(payload);
    expect(result.error).toBeNull();
    expect(result.message).toBe('操作成功');
  });

  it('信封字段形状完整（success/data/error/message 四键）', async () => {
    const result = await callWith(42);
    expect(Object.keys(result).sort()).toEqual([
      'data',
      'error',
      'message',
      'success',
    ]);
  });
});
