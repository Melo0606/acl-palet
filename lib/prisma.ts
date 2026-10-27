import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prismaInstance: PrismaClient | undefined;
};

export const CHEMIN_BASE = process.env.DATABASE_URL ?? "file:./data/acl-palet.db";

function creerClient() {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: CHEMIN_BASE }) });
}

function client() {
  return (globalForPrisma.prismaInstance ??= creerClient());
}

// La restauration d'une sauvegarde remplace le fichier SQLite sous nos pieds :
// il faut donc pouvoir fermer puis rouvrir la connexion. Le Proxy permet de
// garder `import { prisma }` partout tout en pointant toujours vers le client
// courant, y compris apres un remplacement du fichier.
export const prisma = new Proxy({} as PrismaClient, {
  get(_cible, propriete) {
    const courant = client() as unknown as Record<string | symbol, unknown>;
    const valeur = courant[propriete];
    return typeof valeur === "function" ? valeur.bind(courant) : valeur;
  },
});

/// Ferme la connexion en cours. Le prochain acces rouvre le fichier.
export async function fermerBase() {
  const courant = globalForPrisma.prismaInstance;
  globalForPrisma.prismaInstance = undefined;
  await courant?.$disconnect();
}
