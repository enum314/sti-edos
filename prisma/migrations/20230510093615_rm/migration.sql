/*
  Warnings:

  - You are about to drop the column `day` on the `OnlineSession` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `OnlineSession` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `OnlineSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OnlineSession" DROP COLUMN "day",
DROP COLUMN "month",
DROP COLUMN "year";
