/*
  Warnings:

  - You are about to drop the column `joueurs` on the `Equipe` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournoiId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "forfait" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Equipe_tournoiId_fkey" FOREIGN KEY ("tournoiId") REFERENCES "Tournoi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Equipe" ("forfait", "id", "nom", "numero", "tournoiId") SELECT "forfait", "id", "nom", "numero", "tournoiId" FROM "Equipe";
DROP TABLE "Equipe";
ALTER TABLE "new_Equipe" RENAME TO "Equipe";
CREATE INDEX "Equipe_tournoiId_idx" ON "Equipe"("tournoiId");
CREATE UNIQUE INDEX "Equipe_tournoiId_numero_key" ON "Equipe"("tournoiId", "numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
