/*
  Warnings:

  - You are about to drop the column `lieu` on the `Tournoi` table. All the data in the column will be lost.
  - You are about to drop the column `nbTerrains` on the `Tournoi` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournoi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nbPartiesMax" INTEGER NOT NULL DEFAULT 5,
    "nbEquipesMax" INTEGER NOT NULL DEFAULT 64,
    "scoreCible" INTEGER NOT NULL DEFAULT 13,
    "scoreExempt" INTEGER NOT NULL DEFAULT 13,
    "statut" TEXT NOT NULL DEFAULT 'INSCRIPTIONS',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Tournoi" ("creeLe", "date", "id", "nbPartiesMax", "nom", "scoreCible", "scoreExempt", "statut") SELECT "creeLe", "date", "id", "nbPartiesMax", "nom", "scoreCible", "scoreExempt", "statut" FROM "Tournoi";
DROP TABLE "Tournoi";
ALTER TABLE "new_Tournoi" RENAME TO "Tournoi";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
