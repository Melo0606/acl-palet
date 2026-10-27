"use server";

import { executer } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NB_EQUIPES_MAX, NB_TERRAINS_MAX, apparier, calculerStats } from "@/lib/tournoi";
import { creerSauvegarde } from "@/lib/sauvegarde";

/// Charge tout ce qu'il faut pour classer et apparier : equipes du tournoi et
/// rencontres deja disputees.
async function chargerEtat(tournoiId: number) {
  const [tournoi, equipes, rencontres] = await Promise.all([
    prisma.tournoi.findUniqueOrThrow({ where: { id: tournoiId } }),
    prisma.equipe.findMany({ where: { tournoiId }, orderBy: { numero: "asc" } }),
    prisma.rencontre.findMany({
      where: { partie: { tournoiId } },
      select: { equipeAId: true, equipeBId: true, scoreA: true, scoreB: true },
    }),
  ]);
  return { tournoi, equipes, rencontres };
}

export async function getClassement(tournoiId: number) {
  const { equipes, rencontres } = await chargerEtat(tournoiId);
  return calculerStats(equipes, rencontres);
}

/// Premiere partie dont toutes les rencontres n'ont pas encore de score.
async function partieIncomplete(tournoiId: number) {
  return prisma.partie.findFirst({
    where: {
      tournoiId,
      rencontres: { some: { OR: [{ scoreA: null }, { scoreB: null }] } },
    },
    orderBy: { numero: "asc" },
  });
}

/// Construit les lignes `Rencontre` d'un appariement, exemption comprise.
function lignesRencontres(
  partieId: number,
  appariement: ReturnType<typeof apparier>,
  scoreExempt: number,
) {
  const lignes = appariement.paires.map((paire) => ({
    partieId,
    table: paire.table,
    equipeAId: paire.equipeAId,
    equipeBId: paire.equipeBId as number | null,
    revanche: paire.revanche,
    scoreA: null as number | null,
    scoreB: null as number | null,
  }));

  if (appariement.exemptId !== null) {
    // L'equipe exempte est creditee d'une victoire au score convenu : la
    // rencontre est enregistree deja jouee, sans adversaire ni terrain.
    lignes.push({
      partieId,
      table: 0,
      equipeAId: appariement.exemptId,
      equipeBId: null,
      revanche: false,
      scoreA: scoreExempt,
      scoreB: 0,
    });
  }

  return lignes;
}

export async function genererProchainePartie(tournoiId: number) {
  return executer(async () => {
    const { tournoi, equipes, rencontres } = await chargerEtat(tournoiId);

    const enAttente = await partieIncomplete(tournoiId);
    if (enAttente) {
      throw new Error(
        "Tous les scores de la partie " +
          enAttente.numero +
          " doivent être saisis avant de tirer la suivante.",
      );
    }

    const nbParties = await prisma.partie.count({ where: { tournoiId } });
    if (nbParties >= tournoi.nbPartiesMax) {
      throw new Error(
        "Le tournoi se joue en " + tournoi.nbPartiesMax + " parties : elles sont toutes jouées.",
      );
    }

    const actives = equipes.filter((e) => !e.forfait);
    if (actives.length < 2) {
      throw new Error("Il faut au moins 2 équipes non forfait pour tirer une partie.");
    }
    if (actives.length > NB_EQUIPES_MAX) {
      throw new Error(
        actives.length + " équipes pour " + NB_TERRAINS_MAX + " terrains : " + NB_EQUIPES_MAX + " au maximum.",
      );
    }

    const numero = nbParties + 1;

    // Filet de securite avant de modifier le tournoi : on peut toujours revenir
    // a l'etat qui precede le tirage.
    await creerSauvegarde(tournoiId, "Avant tirage partie " + numero, "jalon");

    const stats = calculerStats(equipes, rencontres);
    const appariement = apparier(stats, numero === 1);

    await prisma.$transaction(async (tx) => {
      const partie = await tx.partie.create({ data: { tournoiId, numero } });
      await tx.rencontre.createMany({
        data: lignesRencontres(partie.id, appariement, tournoi.scoreExempt),
      });
      if (tournoi.statut === "INSCRIPTIONS") {
        await tx.tournoi.update({ where: { id: tournoiId }, data: { statut: "EN_COURS" } });
      }
    });

    revalidatePath("/tournois/" + tournoiId, "layout");
    redirect("/tournois/" + tournoiId + "/parties/" + numero);
  });
}

/// Nouveau tirage d'une partie, tant qu'aucun score n'a ete saisi.
export async function relancerTirage(partieId: number) {
  return executer(async () => {
    const partie = await prisma.partie.findUniqueOrThrow({
      where: { id: partieId },
      include: { rencontres: true },
    });

    const dejaSaisie = partie.rencontres.some(
      (r) => r.equipeBId !== null && (r.scoreA !== null || r.scoreB !== null),
    );
    if (dejaSaisie) {
      throw new Error(
        "Des scores sont déjà saisis sur cette partie : le tirage ne peut plus être relancé.",
      );
    }

    const derniere = await prisma.partie.findFirst({
      where: { tournoiId: partie.tournoiId },
      orderBy: { numero: "desc" },
    });
    if (derniere && derniere.numero !== partie.numero) {
      throw new Error("Seule la dernière partie tirée peut être relancée.");
    }

    const { tournoi, equipes, rencontres } = await chargerEtat(partie.tournoiId);
    // Les rencontres de la partie relancee n'ont pas de score : `calculerStats`
    // les ignore, le classement repose donc bien sur les parties precedentes.
    const stats = calculerStats(equipes, rencontres);
    const appariement = apparier(stats, partie.numero === 1);

    await prisma.$transaction(async (tx) => {
      await tx.rencontre.deleteMany({ where: { partieId } });
      await tx.rencontre.createMany({
        data: lignesRencontres(partieId, appariement, tournoi.scoreExempt),
      });
    });

    revalidatePath("/tournois/" + partie.tournoiId, "layout");
  });
}

export async function supprimerPartie(partieId: number) {
  return executer(async () => {
    const partie = await prisma.partie.findUniqueOrThrow({ where: { id: partieId } });

    const derniere = await prisma.partie.findFirst({
      where: { tournoiId: partie.tournoiId },
      orderBy: { numero: "desc" },
    });
    if (derniere && derniere.numero !== partie.numero) {
      throw new Error("Seule la dernière partie peut être supprimée.");
    }

    await creerSauvegarde(
      partie.tournoiId,
      "Avant suppression partie " + partie.numero,
      "jalon",
    );

    await prisma.$transaction(async (tx) => {
      await tx.partie.delete({ where: { id: partieId } });
      await tx.tournoi.update({
        where: { id: partie.tournoiId },
        data: { statut: partie.numero === 1 ? "INSCRIPTIONS" : "EN_COURS" },
      });
    });

    revalidatePath("/tournois/" + partie.tournoiId, "layout");
    redirect("/tournois/" + partie.tournoiId);
  });
}

/// Saisie groupee des scores d'une partie. Les terrains laisses vides restent
/// en attente : on peut enregistrer au fil de l'eau, match par match.
export async function enregistrerScores(partieId: number, formData: FormData) {
  return executer(async () => {
    const partie = await prisma.partie.findUniqueOrThrow({
      where: { id: partieId },
      include: { rencontres: true, tournoi: true },
    });

    const misesAJour: { id: number; scoreA: number | null; scoreB: number | null }[] = [];

    for (const rencontre of partie.rencontres) {
      if (rencontre.equipeBId === null) continue; // exemption : score fige

      const brutA = String(formData.get("scoreA-" + rencontre.id) ?? "").trim();
      const brutB = String(formData.get("scoreB-" + rencontre.id) ?? "").trim();

      if (brutA === "" && brutB === "") {
        misesAJour.push({ id: rencontre.id, scoreA: null, scoreB: null });
        continue;
      }
      if (brutA === "" || brutB === "") {
        throw new Error("Terrain " + rencontre.table + " : les deux scores doivent être saisis.");
      }

      const scoreA = Number(brutA);
      const scoreB = Number(brutB);
      const limite = partie.tournoi.scoreCible;

      if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
        throw new Error("Terrain " + rencontre.table + " : score invalide.");
      }
      if (scoreA > limite || scoreB > limite) {
        throw new Error(
          "Terrain " + rencontre.table + " : le score ne peut pas dépasser " + limite + ".",
        );
      }
      // Le systeme suisse a besoin d'un gagnant et d'un perdant a chaque
      // rencontre : une egalite fausserait les groupes de la partie suivante.
      if (scoreA === scoreB) {
        throw new Error(
          "Terrain " + rencontre.table + " : match nul impossible, départagez les équipes.",
        );
      }

      misesAJour.push({ id: rencontre.id, scoreA, scoreB });
    }

    await prisma.$transaction(
      misesAJour.map((m) =>
        prisma.rencontre.update({
          where: { id: m.id },
          data: { scoreA: m.scoreA, scoreB: m.scoreB },
        }),
      ),
    );

    const complete = misesAJour.every((m) => m.scoreA !== null);
    await prisma.partie.update({
      where: { id: partieId },
      data: { statut: complete ? "TERMINEE" : "EN_COURS" },
    });

    const nbParties = await prisma.partie.count({ where: { tournoiId: partie.tournoiId } });
    if (complete && nbParties >= partie.tournoi.nbPartiesMax) {
      await prisma.tournoi.update({
        where: { id: partie.tournoiId },
        data: { statut: "TERMINE" },
      });
    }

    // Sauvegarde apres chaque saisie : une partie terminee devient un jalon
    // permanent, les saisies intermediaires des points de retour recents.
    await creerSauvegarde(
      partie.tournoiId,
      complete ? "Fin de la partie " + partie.numero : "Scores partie " + partie.numero,
      complete ? "jalon" : "auto",
    );

    revalidatePath("/tournois/" + partie.tournoiId, "layout");
  });
}
