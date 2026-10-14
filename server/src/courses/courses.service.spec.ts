import { ConflictException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';

/** CoursesService 单元测试：mock Prisma，聚焦删除保护与 404 分支（§5.1.1） */
describe('CoursesService', () => {
  const mockPrisma = {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    release: { count: jest.fn() },
  };

  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(mockPrisma as unknown as PrismaService);
  });

  it('create 应透传 DTO 到 prisma.course.create', async () => {
    mockPrisma.course.create.mockResolvedValue({ id: 'c1', title: 'T' });
    await expect(service.create({ title: 'T' })).resolves.toEqual({
      id: 'c1',
      title: 'T',
    });
  });

  it('findOne 不存在时应抛 NotFoundException', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('remove：存在 Release 历史时应抛 ConflictException 且不执行删除（§5.1.1 删除保护）', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
    mockPrisma.release.count.mockResolvedValue(2);
    await expect(service.remove('c1')).rejects.toThrow(ConflictException);
    expect(mockPrisma.course.delete).not.toHaveBeenCalled();
  });

  it('remove：无 Release 时应级联删除成功', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
    mockPrisma.release.count.mockResolvedValue(0);
    mockPrisma.course.delete.mockResolvedValue({ id: 'c1' });
    await expect(service.remove('c1')).resolves.toEqual({ id: 'c1' });
  });

  it('update：课程不存在时 404，不执行更新', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { title: 'A' })).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.course.update).not.toHaveBeenCalled();
  });
});
