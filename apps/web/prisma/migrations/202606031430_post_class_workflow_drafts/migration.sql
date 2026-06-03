-- CreateTable
CREATE TABLE "PostClassWorkflowDraft" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostClassWorkflowDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostClassWorkflowDraft_classSessionId_key" ON "PostClassWorkflowDraft"("classSessionId");

-- CreateIndex
CREATE INDEX "PostClassWorkflowDraft_teacherId_updatedAt_idx" ON "PostClassWorkflowDraft"("teacherId", "updatedAt");

-- CreateIndex
CREATE INDEX "PostClassWorkflowDraft_studentId_updatedAt_idx" ON "PostClassWorkflowDraft"("studentId", "updatedAt");

-- AddForeignKey
ALTER TABLE "PostClassWorkflowDraft" ADD CONSTRAINT "PostClassWorkflowDraft_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostClassWorkflowDraft" ADD CONSTRAINT "PostClassWorkflowDraft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostClassWorkflowDraft" ADD CONSTRAINT "PostClassWorkflowDraft_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
