-- CreateTable
CREATE TABLE "TargetPosition" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "TargetPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTargetSelection" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetPositionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTargetSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TargetPosition_targetId_label_key" ON "TargetPosition"("targetId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "GameTargetSelection_gameId_targetId_key" ON "GameTargetSelection"("gameId", "targetId");

-- AddForeignKey
ALTER TABLE "TargetPosition" ADD CONSTRAINT "TargetPosition_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTargetSelection" ADD CONSTRAINT "GameTargetSelection_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTargetSelection" ADD CONSTRAINT "GameTargetSelection_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTargetSelection" ADD CONSTRAINT "GameTargetSelection_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "TargetPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
