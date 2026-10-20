-- 2026-10-20 二次改拍：AI 配置再按模式维度（System Prompt / Welcome Message / LLM Model 按 Lecture / Socratic 分开）
-- 前向迁移：新增 6 列 → 由单一 customSystemPrompt / customWelcomeMsg / llmModel 回填到两个模式（存量值回填，现状不失） → 删除旧的单一列

ALTER TABLE "CourseAiConfig" ADD COLUMN "lectureSystemPrompt" TEXT;
ALTER TABLE "CourseAiConfig" ADD COLUMN "socraticSystemPrompt" TEXT;
ALTER TABLE "CourseAiConfig" ADD COLUMN "lectureWelcomeMsg" TEXT;
ALTER TABLE "CourseAiConfig" ADD COLUMN "socraticWelcomeMsg" TEXT;
ALTER TABLE "CourseAiConfig" ADD COLUMN "lectureModel" TEXT;
ALTER TABLE "CourseAiConfig" ADD COLUMN "socraticModel" TEXT;

UPDATE "CourseAiConfig"
SET "lectureSystemPrompt" = "customSystemPrompt",
    "socraticSystemPrompt" = "customSystemPrompt",
    "lectureWelcomeMsg" = "customWelcomeMsg",
    "socraticWelcomeMsg" = "customWelcomeMsg",
    "lectureModel" = "llmModel",
    "socraticModel" = "llmModel";

ALTER TABLE "CourseAiConfig" DROP COLUMN "customSystemPrompt";
ALTER TABLE "CourseAiConfig" DROP COLUMN "customWelcomeMsg";
ALTER TABLE "CourseAiConfig" DROP COLUMN "llmModel";
