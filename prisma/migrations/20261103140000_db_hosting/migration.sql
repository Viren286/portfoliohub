-- CreateTable
CREATE TABLE "SitePointer" (
    "slug" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePointer_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "SiteFile" (
    "deploymentId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "cacheControl" TEXT NOT NULL,
    "body" BYTEA NOT NULL,

    CONSTRAINT "SiteFile_pkey" PRIMARY KEY ("deploymentId","path")
);

-- CreateTable
CREATE TABLE "StoredObject" (
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "cacheControl" TEXT,
    "contentDisposition" TEXT,
    "body" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("key")
);
