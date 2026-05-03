-- CreateTable
CREATE TABLE "user_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_templates_userId_idx" ON "user_templates"("userId");
