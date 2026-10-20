-- 2026-10-20 AI 配置改按 Release 维度（开发文档 §2）
-- 变更：① Course 新增 aiTestReleaseId（后台测试所选 Release）与 aiTutorOnline（课程级 Online 开关）；
--      ② CourseAiConfig 由「每课程一份」改为「每个 Release 一份」：新增 releaseId + 唯一键 (courseId, releaseId)，
--         移除 courseId @unique 与 online 列。
-- 存量迁移（用户已批准）：现有每课程一份配置 → 关联到该课程的上线版本（currentReleaseId）；
--      课程无任何 Release（currentReleaseId IS NULL）的旧配置行**不迁移、直接删除**。

-- 1) Course 新增两列
ALTER TABLE "Course" ADD COLUMN "aiTestReleaseId" TEXT;
ALTER TABLE "Course" ADD COLUMN "aiTutorOnline" BOOLEAN NOT NULL DEFAULT false;

-- 2) 存量 CourseAiConfig.online=true → Course.aiTutorOnline（online 语义由配置级搬到课程级）
UPDATE "Course" c
SET "aiTutorOnline" = cfg."online"
FROM "CourseAiConfig" cfg
WHERE cfg."courseId" = c."id" AND cfg."online" = true;

-- 3) CourseAiConfig 增加 releaseId（先可空，便于回填）
ALTER TABLE "CourseAiConfig" ADD COLUMN "releaseId" TEXT;

-- 4) 存量配置回填：关联到该课程的上线版本
UPDATE "CourseAiConfig" cfg
SET "releaseId" = c."currentReleaseId"
FROM "Course" c
WHERE cfg."courseId" = c."id" AND c."currentReleaseId" IS NOT NULL;

-- 5) 无法关联 Release 的存量行删除（无 Release 课程的配置不迁移）
DELETE FROM "CourseAiConfig" WHERE "releaseId" IS NULL;

-- 6) releaseId 收紧为 NOT NULL
ALTER TABLE "CourseAiConfig" ALTER COLUMN "releaseId" SET NOT NULL;

-- 7) 移除配置级 online 列（语义已搬至 Course.aiTutorOnline）
ALTER TABLE "CourseAiConfig" DROP COLUMN "online";

-- 8) 唯一约束：去掉 courseId 单列唯一，改为 (courseId, releaseId)
DROP INDEX "CourseAiConfig_courseId_key";
CREATE UNIQUE INDEX "CourseAiConfig_courseId_releaseId_key" ON "CourseAiConfig"("courseId", "releaseId");

-- 9) 新外键：releaseId → Release(id)（Release 删除时级联删除其 AI 配置）
ALTER TABLE "CourseAiConfig" ADD CONSTRAINT "CourseAiConfig_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;
