import { NotFoundException } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { PrismaService } from '../prisma/prisma.service';

/** ReleasesService 单元测试：快照结构与 versionTag 格式（§5.1.4、§2） */
describe('ReleasesService', () => {
  const mockPrisma = {
    course: { findUnique: jest.fn() },
    release: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  };

  let service: ReleasesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReleasesService(mockPrisma as unknown as PrismaService);
  });

  it('publish：快照应含 lessons/pages 全量内容，versionTag 匹配 CourseName_YYYYMMDDHHmmss', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({
      id: 'c1',
      title: '数学基础',
      lessons: [
        {
          id: 'l1',
          title: '第一章',
          pages: [
            { id: 'p1', title: '1.1', contentMd: '# hi', tags: ['Core'] },
          ],
        },
      ],
    });
    mockPrisma.release.create.mockImplementation(({ data }: { data: unknown }) =>
      Promise.resolve(data),
    );

    const result = (await service.publish('c1', {
      revisionNotes: '首发',
    })) as { versionTag: string; snapshotData: unknown; revisionNotes: string };

    expect(result.versionTag).toMatch(/^数学基础_\d{14}$/);
    expect(result.snapshotData).toEqual({
      lessons: [
        {
          id: 'l1',
          title: '第一章',
          pages: [{ id: 'p1', title: '1.1', contentMd: '# hi', tags: ['Core'] }],
        },
      ],
    });
    expect(result.revisionNotes).toBe('首发');
  });

  it('publish：课程不存在时 404', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(null);
    await expect(
      service.publish('missing', { revisionNotes: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('findAllByCourse：列表不应包含 snapshotData', async () => {
    mockPrisma.course.findUnique.mockResolvedValue({ id: 'c1' });
    mockPrisma.release.findMany.mockResolvedValue([{ id: 'r1' }]);
    const list = await service.findAllByCourse('c1');
    expect(list).toEqual([{ id: 'r1' }]);
    const select = mockPrisma.release.findMany.mock.calls[0][0] as {
      select: { snapshotData?: unknown };
    };
    expect(select.select.snapshotData).toBeUndefined();
  });
});
