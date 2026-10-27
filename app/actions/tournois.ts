"use server";

import { executer } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NB_EQUIPES_MAX } from "@/lib/tournoi";

export async function getTournois() {
  return prisma.tournoi.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { equipes: true, parties: true } } },
  });
}

export async function getTournoi(id: number) {
  return prisma.tournoi.findUnique({
    where: { id },
    include: {
      equipes: { orderBy: { numero: "asc" } },
      parties: {
        orderBy: { numero: "asc" },
        include: { rencontres: { orderBy: { table: "asc" } } },
      },
    },
  });
}

function parseForm(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "");
  const nbPartiesMax = Number(formData.get("nbPartiesMax") ?? 5);
  const nbEquipesMax = Number(formData.get("nbEquipesMax") ?? NB_EQUIPES_MAX);
  const scoreCible = Number(formData.get("scoreCible") ?? 13);

  if (!nom) throw new Error("Le nom du tournoi est obligatoire.");
  if (!Number.isInteger(nbPartiesMax) || nbPartiesMax < 1 || nbPartiesMax > 12) {
    throw new Error("Le nombre de parties doit être compris entre 1 et 12.");
  }
  if (!Number.isInteger(nbEquipesMax) || nbEquipesMax < 2 || nbEquipesMax > NB_EQUIPES_MAX) {
    throw new Error("Le nombre d'équipes doit être compris entre 2 et " + NB_EQUIPES_MAX + ".");
  }
  if (!Number.isInteger(scoreCible) || scoreCible < 1 || scoreCible > 100) {
    throw new Error("Le nombre de points pour gagner doit être compris entre 1 et 100.");
  }

  const date = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Date invalide.");

  return { nom, date, nbPartiesMax, nbEquipesMax, scoreCible, scoreExempt: scoreCible };
}

export async function createTournoi(formData: FormData) {
  return executer(async () => {
    const data = parseForm(formData);
    const tournoi = await prisma.tournoi.create({ data });
    revalidatePath("/");
    redirect(`/tournois/${tournoi.id}/equipes`);
  });
}

export async function updateTournoi(id: number, formData: FormData) {
  return executer(async () => {
    const data = parseForm(formData);

    const nbEquipes = await prisma.equipe.count({ where: { tournoiId: id } });
    if (nbEquipes > data.nbEquipesMax) {
      throw new Error(
        nbEquipes + " équipes sont déjà inscrites : l'effectif ne peut pas être inférieur.",
      );
    }

    await prisma.tournoi.update({ where: { id }, data });
    revalidatePath(`/tournois/${id}`);
    redirect(`/tournois/${id}`);
  });
}

export async function deleteTournoi(id: number) {
  return executer(async () => {
    await prisma.tournoi.delete({ where: { id } });
    revalidatePath("/");
    redirect("/");
  });
}
