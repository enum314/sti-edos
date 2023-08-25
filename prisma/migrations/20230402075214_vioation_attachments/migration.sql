/*
  Warnings:

  - Made the column `userId` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Violation" ADD COLUMN     "attachments" TEXT[];

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
