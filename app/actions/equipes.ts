"use server";

import { executer } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function garantirInscriptionsOuvertes(tournoiId: number) {
  const nbParties = await prisma.partie.count({ where: { tournoiId } });
  if (nbParties > 0) {
    throw new Error(
      "Le tournoi a commencé : il n'est plus possible de modifier la liste des équipes. Déclarez plutôt un forfait.",
    );
  }
}

async function garantirPlaceDisponible(tournoiId: number, ajouts: number) {
  const tournoi = await prisma.tournoi.findUniqueOrThrow({ where: { id: tournoiId } });
  const nbEquipes = await prisma.equipe.count({ where: { tournoiId } });
  if (nbEquipes + ajouts > tournoi.nbEquipesMax) {
    throw new Error(
      `Le tournoi est prévu pour ${tournoi.nbEquipesMax} équipes (${nbEquipes} déjà inscrites). Augmentez l'effectif dans les paramètres.`,
    );
  }
}

/// Les numeros sont attribues dans l'ordre d'inscription, sans trou : la
/// suppression d'une equipe (avant le debut) resserre la numerotation.
async function prochainNumero(tournoiId: number) {
  return (await prisma.equipe.count({ where: { tournoiId } })) + 1;
}

function parseNom(brut: FormDataEntryValue | null) {
  const nom = String(brut ?? "").trim();
  if (!nom) throw new Error("Le nom est obligatoire (nom d'équipe ou prénom et nom).");
  return nom;
}

export async function createEquipe(tournoiId: number, formData: FormData) {
  return executer(async () => {
    const nom = parseNom(formData.get("nom"));
    await garantirInscriptionsOuvertes(tournoiId);
    await garantirPlaceDisponible(tournoiId, 1);

    await prisma.equipe.create({
      data: { tournoiId, nom, numero: await prochainNumero(tournoiId) },
    });
    revalidatePath(`/tournois/${tournoiId}/equipes`);
  });
}

/// Import en masse : une equipe par ligne, numerotees dans l'ordre de la liste.
export async function importerEquipes(tournoiId: number, formData: FormData) {
  return executer(async () => {
    const noms = String(formData.get("liste") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (noms.length === 0) throw new Error("Aucune équipe à importer.");

    await garantirInscriptionsOuvertes(tournoiId);
    await garantirPlaceDisponible(tournoiId, noms.length);

    let numero = await prochainNumero(tournoiId);
    await prisma.equipe.createMany({
      data: noms.map((nom) => ({ tournoiId, nom, numero: numero++ })),
    });
    revalidatePath(`/tournois/${tournoiId}/equipes`);
  });
}

export async function updateEquipe(id: number, formData: FormData) {
  return executer(async () => {
    const nom = parseNom(formData.get("nom"));
    const equipe = await prisma.equipe.update({ where: { id }, data: { nom } });
    revalidatePath(`/tournois/${equipe.tournoiId}`, "layout");
  });
}

export async function deleteEquipe(id: number) {
  return executer(async () => {
    const equipe = await prisma.equipe.findUniqueOrThrow({ where: { id } });
    await garantirInscriptionsOuvertes(equipe.tournoiId);

    const suivantes = await prisma.equipe.findMany({
      where: { tournoiId: equipe.tournoiId, numero: { gt: equipe.numero } },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true },
    });

    // Les equipes suivantes descendent d'un cran, dans l'ordre croissant : le
    // numero liberé juste en dessous l'est toujours au moment de l'affecter.
    await prisma.$transaction([
      prisma.equipe.delete({ where: { id } }),
      ...suivantes.map((s) =>
        prisma.equipe.update({ where: { id: s.id }, data: { numero: s.numero - 1 } }),
      ),
    ]);
    revalidatePath(`/tournois/${equipe.tournoiId}/equipes`);
  });
}

/// Le forfait reste possible en cours de tournoi : l'equipe garde ses resultats
/// acquis mais ne recoit plus d'adversaire aux parties suivantes.
export async function basculerForfait(id: number) {
  return executer(async () => {
    const equipe = await prisma.equipe.findUniqueOrThrow({ where: { id } });
    await prisma.equipe.update({ where: { id }, data: { forfait: !equipe.forfait } });
    revalidatePath(`/tournois/${equipe.tournoiId}`, "layout");
  });
}
