-- CreateEnum
CREATE TYPE "ViolationLevel" AS ENUM ('MINOR', 'MAJOR_A', 'MAJOR_B', 'MAJOR_C', 'MAJOR_D');

-- AlterTable
ALTER TABLE "Violation" ADD COLUMN     "level" "ViolationLevel" NOT NULL DEFAULT 'MINOR';
