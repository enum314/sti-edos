/*
  Warnings:

  - You are about to drop the `ViolationAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ViolationAttachment" DROP CONSTRAINT "ViolationAttachment_violationId_fkey";

-- DropTable
DROP TABLE "ViolationAttachment";

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT,
    "fileName" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
