-- CreateEnum
CREATE TYPE "SyncState" AS ENUM ('SYNCED', 'STALE');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "syncState" "SyncState" NOT NULL DEFAULT 'SYNCED';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "syncState" "SyncState" NOT NULL DEFAULT 'SYNCED';
