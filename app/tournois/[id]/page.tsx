import Link from "next/link";
import { notFound } from "next/navigation";
import { genererProchainePartie, getClassement } from "@/app/actions/parties";
import { prisma } from "@/lib/prisma";
import { BoutonAction } from "@/components/BoutonAction";
import { FormulaireAction } from "@/components/FormulaireAction";
import { TableClassement } from "@/components/TableClassement";
import { nbTerrainsPour } from "@/lib/tournoi";
import {
  buttonClass,
  buttonSecondaryClass,
  cardPadClass,
  mutedClass,
  sectionHeadingClass,
} from "@/lib/ui";

export default async function TableauDeBord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournoiId = Number(id);

  const tournoi = await prisma.tournoi.findUnique({
    where: { id: tournoiId },
    include: {
      equipes: true,
      parties: {
        orderBy: { numero: "asc" },
        include: { rencontres: { select: { scoreA: true, equipeBId: true } } },
      },
    },
  });
  if (!tournoi) notFound();

  const classement = await getClassement(tournoiId);
  const actives = tournoi.equipes.filter((e) => !e.forfait);
  const partieEnCours = tournoi.parties.find((p) => p.rencontres.some((r) => r.scoreA === null));
  const toutesJouees = tournoi.parties.length >= tournoi.nbPartiesMax;

  const genererPartie = genererProchainePartie.bind(null, tournoiId);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Statistique libelle="Équipes en lice" valeur={actives.length} />
        <Statistique
          libelle="Terrains utilisés"
          valeur={actives.length > 1 ? Math.floor(actives.length / 2) : 0}
          detail={`sur ${nbTerrainsPour(tournoi.nbEquipesMax)}`}
        />
        <Statistique
          libelle="Parties jouées"
          valeur={tournoi.parties.filter((p) => p.rencontres.every((r) => r.scoreA !== null)).length}
          detail={`sur ${tournoi.nbPartiesMax}`}
        />
        <Statistique
          libelle="Forfaits"
          valeur={tournoi.equipes.length - actives.length}
        />
      </div>

      <section className={`${cardPadClass} space-y-3`}>
        <h2 className={sectionHeadingClass}>Prochaine étape</h2>

        {actives.length < 2 ? (
          <p className={`text-sm ${mutedClass}`}>
            Inscrivez au moins 2 équipes pour lancer le tournoi.{" "}
            <Link href={`/tournois/${tournoiId}/equipes`} className="text-accent hover:underline">
              Gérer les équipes
            </Link>
          </p>
        ) : partieEnCours ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className={`text-sm ${mutedClass}`}>
              La partie {partieEnCours.numero} est en cours : saisissez les scores pour pouvoir
              tirer la suivante.
            </p>
            <Link
              href={`/tournois/${tournoiId}/parties/${partieEnCours.numero}`}
              className={buttonClass}
            >
              Saisir les scores de la partie {partieEnCours.numero}
            </Link>
          </div>
        ) : toutesJouees ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className={`text-sm ${mutedClass}`}>
              Les {tournoi.nbPartiesMax} parties sont jouées : le classement est définitif.
            </p>
            <Link href={`/tournois/${tournoiId}/classement`} className={buttonClass}>
              Voir le classement final
            </Link>
          </div>
        ) : (
          <FormulaireAction action={genererPartie} className="flex flex-wrap items-center gap-3">
            <p className={`text-sm ${mutedClass}`}>
              {tournoi.parties.length === 0
                ? "Tirage au sort intégral pour la première partie."
                : `Tirage au sort de la partie ${tournoi.parties.length + 1} : gagnants contre gagnants, sans rejouer un duel déjà disputé.`}
            </p>
            <BoutonAction
              confirmation={
                tournoi.parties.length === 0
                  ? undefined
                  : `Tirer la partie ${tournoi.parties.length + 1} ?

Les scores de la partie ${tournoi.parties.length} ne seront plus modifiables. Vérifiez-les avant de continuer.
(En cas d'erreur, il restera possible de supprimer la partie ${tournoi.parties.length + 1} ou de restaurer une sauvegarde.)`
              }
            >
              Tirer la partie {tournoi.parties.length + 1}
            </BoutonAction>
          </FormulaireAction>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <section className="space-y-2">
          <h2 className={sectionHeadingClass}>Parties</h2>
          {tournoi.parties.length === 0 && (
            <p className={`${cardPadClass} text-sm ${mutedClass}`}>Aucune partie tirée.</p>
          )}
          {tournoi.parties.map((partie) => {
            const total = partie.rencontres.filter((r) => r.equipeBId !== null).length;
            const saisis = partie.rencontres.filter(
              (r) => r.equipeBId !== null && r.scoreA !== null,
            ).length;
            const terminee = saisis === total;
            return (
              <Link
                key={partie.id}
                href={`/tournois/${tournoiId}/parties/${partie.numero}`}
                className={`${cardPadClass} flex items-center justify-between gap-3 transition-colors hover:border-accent`}
              >
                <span className="font-medium">Partie {partie.numero}</span>
                <span className={`text-sm ${terminee ? "text-pos" : mutedClass}`}>
                  {terminee ? "Terminée" : `${saisis}/${total} scores`}
                </span>
              </Link>
            );
          })}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className={sectionHeadingClass}>Classement</h2>
            <Link href={`/tournois/${tournoiId}/classement`} className={buttonSecondaryClass}>
              Classement complet
            </Link>
          </div>
          <TableClassement classement={classement.slice(0, 10)} />
        </section>
      </div>
    </div>
  );
}

function Statistique({
  libelle,
  valeur,
  detail,
}: {
  libelle: string;
  valeur: number;
  detail?: string;
}) {
  return (
    <div className={cardPadClass}>
      <p className={`text-xs uppercase tracking-wide ${mutedClass}`}>{libelle}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {valeur}
        {detail && <span className={`ml-1.5 text-sm font-normal ${mutedClass}`}>{detail}</span>}
      </p>
    </div>
  );
}
