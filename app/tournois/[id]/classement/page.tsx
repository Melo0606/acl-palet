import { notFound } from "next/navigation";
import { getClassement } from "@/app/actions/parties";
import { prisma } from "@/lib/prisma";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import { EnteteImpression } from "@/components/EnteteImpression";
import { TableClassement } from "@/components/TableClassement";
import { mutedClass, sectionHeadingClass } from "@/lib/ui";

export default async function PageClassement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournoiId = Number(id);

  const tournoi = await prisma.tournoi.findUnique({
    where: { id: tournoiId },
    include: { _count: { select: { parties: true } } },
  });
  if (!tournoi) notFound();

  const classement = await getClassement(tournoiId);
  const definitif = tournoi.statut === "TERMINE";

  return (
    <div className="space-y-4">
      <EnteteImpression
        titre={tournoi.nom}
        sousTitre={`Classement ${definitif ? "final" : "provisoire"} — ${new Date(tournoi.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={sectionHeadingClass}>
            Classement {definitif ? "final" : "provisoire"}
            <span className={`ml-2 text-sm font-normal ${mutedClass}`}>
              après {tournoi._count.parties} partie{tournoi._count.parties > 1 ? "s" : ""}
            </span>
          </h2>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            Victoires, puis goal-average (pts marqués − pts encaissés), puis pts marqués.
          </p>
        </div>
        <div className="no-print">
          <BoutonImprimer libelle="Imprimer le classement" />
        </div>
      </div>

      <TableClassement classement={classement} complet />
    </div>
  );
}
