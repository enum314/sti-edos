/*
  Warnings:

  - You are about to drop the `PermitDenial` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PermitDenial" DROP CONSTRAINT "PermitDenial_authorId_fkey";

-- DropForeignKey
ALTER TABLE "PermitDenial" DROP CONSTRAINT "PermitDenial_permitId_fkey";

-- DropTable
DROP TABLE "PermitDenial";

-- CreateTable
CREATE TABLE "PermitRejection" (
    "id" TEXT NOT NULL,
    "permitId" INTEGER NOT NULL,
    "comment" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermitRejection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitRevocation" (
    "id" TEXT NOT NULL,
    "permitId" INTEGER NOT NULL,
    "comment" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermitRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermitRejection_permitId_key" ON "PermitRejection"("permitId");

-- CreateIndex
CREATE UNIQUE INDEX "PermitRevocation_permitId_key" ON "PermitRevocation"("permitId");

-- AddForeignKey
ALTER TABLE "PermitRejection" ADD CONSTRAINT "PermitRejection_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitRejection" ADD CONSTRAINT "PermitRejection_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitRevocation" ADD CONSTRAINT "PermitRevocation_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitRevocation" ADD CONSTRAINT "PermitRevocation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
