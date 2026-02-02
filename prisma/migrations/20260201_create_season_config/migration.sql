-- CreateTable
CREATE TABLE "SeasonConfig" (
    "id" SERIAL NOT NULL,
    "tierName" TEXT NOT NULL,
    "wclTierUrl" TEXT NOT NULL,
    "wclZoneId" INTEGER NOT NULL,
    "encounterOrder" JSONB NOT NULL,
    "encounterNames" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeasonConfig_isActive_idx" ON "SeasonConfig"("isActive");

-- Ensure only one active config at a time
CREATE UNIQUE INDEX "SeasonConfig_isActive_unique" ON "SeasonConfig"("isActive") WHERE "isActive" = true;
