-- CreateTable
CREATE TABLE "ViolationAttachment" (
    "id" TEXT NOT NULL,
    "violationId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,

    CONSTRAINT "ViolationAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ViolationAttachment" ADD CONSTRAINT "ViolationAttachment_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "Violation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
