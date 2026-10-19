/*
  Warnings:

  - You are about to drop the column `lessonId` on the `Page` table. All the data in the column will be lost.
  - You are about to drop the `Lesson` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `courseId` to the `Page` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Page" DROP CONSTRAINT "Page_lessonId_fkey";

-- DropIndex
DROP INDEX "Page_lessonId_sortOrder_idx";

-- AlterTable
ALTER TABLE "Page" DROP COLUMN "lessonId",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "sectionTags" JSONB;

-- DropTable
DROP TABLE "Lesson";

-- CreateIndex
CREATE INDEX "Page_courseId_sortOrder_idx" ON "Page"("courseId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
