import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OngletsTournoi } from "@/components/OngletsTournoi";
import { nbTerrainsPour } from "@/lib/tournoi";
import { badgeClass, mutedClass, pageHeadingClass } from "@/lib/ui";

const libelleStatut = {
  INSCRIPTIONS: { texte: "Inscriptions", classe: "bg-accent-soft text-accent-strong" },
  EN_COURS: { texte: "En cours", classe: "bg-warn-soft text-warn" },
  TERMINE: { texte: "Terminé", classe: "bg-pos-soft text-pos" },
} as const;

export default async function LayoutTournoi({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournoiId = Number(id);
  if (!Number.isInteger(tournoiId)) notFound();

  const tournoi = await prisma.tournoi.findUnique({
    where: { id: tournoiId },
    include: {
      _count: { select: { equipes: true } },
      parties: { orderBy: { numero: "asc" }, select: { numero: true } },
    },
  });
  if (!tournoi) notFound();

  const statut = libelleStatut[tournoi.statut];

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={pageHeadingClass}>{tournoi.nom}</h1>
            <span className={`${badgeClass} ${statut.classe}`}>{statut.texte}</span>
          </div>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            {new Date(tournoi.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {tournoi._count.equipes} équipe{tournoi._count.equipes > 1 ? "s" : ""} inscrite
            {tournoi._count.equipes > 1 ? "s" : ""} sur {tournoi.nbEquipesMax} ·{" "}
            {nbTerrainsPour(tournoi.nbEquipesMax)} terrains · victoire en {tournoi.scoreCible} points
          </p>
        </div>
        <Link href="/" className={`text-sm ${mutedClass} hover:text-text`}>
          ← Tous les tournois
        </Link>
      </div>

      <OngletsTournoi
        tournoiId={tournoi.id}
        parties={tournoi.parties.map((p) => p.numero)}
        nbPartiesMax={tournoi.nbPartiesMax}
      />

      {children}
    </div>
  );
}
