-- 2026-10-22: Portal 课程目录标题同步
-- Page.externalId 保存 Portal lesson.id，作为课时标题同步的稳定匹配键。
-- 可空 + 复合唯一索引：历史页面保持 NULL，不阻塞现有数据。
ALTER TABLE "Page" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Page_courseId_externalId_key" ON "Page"("courseId", "externalId");
