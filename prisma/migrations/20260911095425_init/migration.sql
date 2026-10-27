-- CreateTable
CREATE TABLE "Tournoi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lieu" TEXT,
    "nbPartiesMax" INTEGER NOT NULL DEFAULT 5,
    "nbTerrains" INTEGER NOT NULL DEFAULT 32,
    "scoreCible" INTEGER NOT NULL DEFAULT 12,
    "scoreExempt" INTEGER NOT NULL DEFAULT 12,
    "statut" TEXT NOT NULL DEFAULT 'INSCRIPTIONS',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournoiId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "joueurs" TEXT,
    "forfait" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Equipe_tournoiId_fkey" FOREIGN KEY ("tournoiId") REFERENCES "Tournoi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Partie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournoiId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "creeLe" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Partie_tournoiId_fkey" FOREIGN KEY ("tournoiId") REFERENCES "Tournoi" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rencontre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partieId" INTEGER NOT NULL,
    "table" INTEGER NOT NULL,
    "equipeAId" INTEGER NOT NULL,
    "equipeBId" INTEGER,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "revanche" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Rencontre_partieId_fkey" FOREIGN KEY ("partieId") REFERENCES "Partie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rencontre_equipeAId_fkey" FOREIGN KEY ("equipeAId") REFERENCES "Equipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rencontre_equipeBId_fkey" FOREIGN KEY ("equipeBId") REFERENCES "Equipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Equipe_tournoiId_idx" ON "Equipe"("tournoiId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_tournoiId_numero_key" ON "Equipe"("tournoiId", "numero");

-- CreateIndex
CREATE INDEX "Partie_tournoiId_idx" ON "Partie"("tournoiId");

-- CreateIndex
CREATE UNIQUE INDEX "Partie_tournoiId_numero_key" ON "Partie"("tournoiId", "numero");

-- CreateIndex
CREATE INDEX "Rencontre_partieId_idx" ON "Rencontre"("partieId");

-- CreateIndex
CREATE INDEX "Rencontre_equipeAId_idx" ON "Rencontre"("equipeAId");

-- CreateIndex
CREATE INDEX "Rencontre_equipeBId_idx" ON "Rencontre"("equipeBId");
