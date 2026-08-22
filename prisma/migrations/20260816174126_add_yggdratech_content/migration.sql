-- CreateTable
CREATE TABLE "yggdratech_contents" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yggdratech_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "yggdratech_contents_key_key" ON "yggdratech_contents"("key");

-- CreateIndex
CREATE INDEX "yggdratech_contents_published_idx" ON "yggdratech_contents"("published");

-- AddForeignKey
ALTER TABLE "yggdratech_contents" ADD CONSTRAINT "yggdratech_contents_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
