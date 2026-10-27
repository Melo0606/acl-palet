import { access, mkdir, readdir, rm, stat } from "node:fs/promises";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { CHEMIN_BASE, fermerBase, prisma } from "@/lib/prisma";

/// Nombre de sauvegardes automatiques conservees. Les jalons (fin de partie,
/// avant restauration...) ne sont jamais supprimes automatiquement.
const MAX_AUTOMATIQUES = 60;

export type TypeSauvegarde = "auto" | "jalon";

export type Sauvegarde = {
  fichier: string;
  chemin: string;
  type: TypeSauvegarde;
  tournoiId: number | null;
  libelle: string;
  date: Date;
  taille: number;
};

function fichierBase() {
  // DATABASE_URL est de la forme "file:./data/acl-palet.db".
  const relatif = CHEMIN_BASE.replace(/^file:/, "");
  // Le chemin depend de l'environnement : Turbopack ne doit pas essayer de le
  // tracer statiquement (il embarquerait tout le projet dans le build).
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), relatif);
}

function dossierSauvegardes() {
  return path.join(path.dirname(fichierBase()), "sauvegardes");
}

/// Les metadonnees vivent dans le nom du fichier : la liste reste lisible meme
/// apres une restauration, qui remettrait en arriere n'importe quelle table.
function encoder(valeur: string) {
  return valeur.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "sauvegarde";
}

function decoder(valeur: string) {
  return valeur.replace(/-/g, " ");
}

export async function creerSauvegarde(
  tournoiId: number | null,
  libelle: string,
  type: TypeSauvegarde = "auto",
): Promise<Sauvegarde | null> {
  const dossier = dossierSauvegardes();
  await mkdir(dossier, { recursive: true });

  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const fichier = `${horodatage}__${type}__t${tournoiId ?? 0}__${encoder(libelle)}.db`;
  const destination = path.join(dossier, fichier);

  // VACUUM INTO ecrit un instantane coherent dans un fichier unique, sans
  // journal WAL a cote : c'est la maniere sure de copier une base ouverte.
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);

  if (type === "auto") await purgerAutomatiques();

  const infos = await stat(destination);
  return {
    fichier,
    chemin: destination,
    type,
    tournoiId,
    libelle,
    date: infos.mtime,
    taille: infos.size,
  };
}

export async function listerSauvegardes(tournoiId?: number): Promise<Sauvegarde[]> {
  const dossier = dossierSauvegardes();
  let fichiers: string[];
  try {
    fichiers = await readdir(dossier);
  } catch {
    return [];
  }

  const sauvegardes: Sauvegarde[] = [];
  for (const fichier of fichiers) {
    if (!fichier.endsWith(".db")) continue;
    const parties = fichier.slice(0, -3).split("__");
    if (parties.length < 4) continue;

    const [, type, tournoi, libelle] = parties;
    const id = Number(tournoi.replace(/^t/, ""));
    if (tournoiId !== undefined && id !== tournoiId) continue;

    const chemin = path.join(dossier, fichier);
    const infos = await stat(chemin);
    sauvegardes.push({
      fichier,
      chemin,
      type: type === "jalon" ? "jalon" : "auto",
      tournoiId: id || null,
      libelle: decoder(libelle),
      // L'horodatage du nom sert au tri ; la date affichee vient du fichier,
      // sans avoir a re-parser un ISO dont les separateurs ont ete echappes.
      date: infos.mtime,
      taille: infos.size,
    });
  }

  return sauvegardes.sort((a, b) => b.fichier.localeCompare(a.fichier));
}

async function purgerAutomatiques() {
  const sauvegardes = await listerSauvegardes();
  const automatiques = sauvegardes.filter((s) => s.type === "auto");
  for (const obsolete of automatiques.slice(MAX_AUTOMATIQUES)) {
    await rm(obsolete.chemin, { force: true });
  }
}

/// Restaure une sauvegarde. L'etat courant est d'abord archive en jalon, pour
/// qu'une restauration faite par erreur reste elle aussi annulable.
export async function restaurerSauvegarde(fichier: string) {
  if (path.basename(fichier) !== fichier) throw new Error("Nom de sauvegarde invalide.");

  const source = path.join(dossierSauvegardes(), fichier);
  await access(source);

  await creerSauvegarde(null, "Avant restauration", "jalon");

  const cible = fichierBase();
  await fermerBase();

  await copyFile(source, cible);
  // Un WAL residuel de l'ancienne base masquerait le contenu restaure.
  await rm(`${cible}-wal`, { force: true });
  await rm(`${cible}-shm`, { force: true });
}

export async function supprimerSauvegarde(fichier: string) {
  if (path.basename(fichier) !== fichier) throw new Error("Nom de sauvegarde invalide.");
  await rm(path.join(dossierSauvegardes(), fichier), { force: true });
}
