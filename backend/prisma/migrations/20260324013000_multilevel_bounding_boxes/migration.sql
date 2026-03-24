-- AlterTable
ALTER TABLE "Game"
ADD COLUMN "currentLevelOrder" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "waldoTolerance",
DROP COLUMN "waldoX",
DROP COLUMN "waldoY";

-- DropTable
DROP TABLE "Character";

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameFoundTarget" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameFoundTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Level_slug_key" ON "Level"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Level_orderIndex_key" ON "Level"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Target_levelId_name_key" ON "Target"("levelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GameFoundTarget_gameId_targetId_key" ON "GameFoundTarget"("gameId", "targetId");

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameFoundTarget" ADD CONSTRAINT "GameFoundTarget_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameFoundTarget" ADD CONSTRAINT "GameFoundTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
