import Link from "next/link";
import { notFound } from "next/navigation";
import {
  enregistrerScores,
  genererProchainePartie,
  relancerTirage,
  supprimerPartie,
} from "@/app/actions/parties";
import { prisma } from "@/lib/prisma";
import { BoutonAction } from "@/components/BoutonAction";
import { FormulaireAction } from "@/components/FormulaireAction";
import { AfficheTirage } from "@/components/AfficheTirage";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import { SaisieScores } from "@/components/SaisieScores";
import {
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  mutedClass,
  sectionHeadingClass,
} from "@/lib/ui";

export default async function PagePartie({
  params,
}: {
  params: Promise<{ id: string; numero: string }>;
}) {
  const { id, numero } = await params;
  const tournoiId = Number(id);
  const numeroPartie = Number(numero);

  const partie = await prisma.partie.findUnique({
    where: { tournoiId_numero: { tournoiId, numero: numeroPartie } },
    include: {
      tournoi: { include: { _count: { select: { parties: true } } } },
      rencontres: {
        orderBy: { table: "asc" },
        include: {
          equipeA: { select: { numero: true, nom: true } },
          equipeB: { select: { numero: true, nom: true } },
        },
      },
    },
  });
  if (!partie) notFound();

  const { tournoi } = partie;
  const estDerniere = partie.numero === tournoi._count.parties;
  const aJouer = partie.rencontres.filter((r) => r.equipeBId !== null);
  const saisis = aJouer.filter((r) => r.scoreA !== null).length;
  const terminee = saisis === aJouer.length;
  const aucunScore = saisis === 0;
  const revanches = partie.rencontres.filter((r) => r.revanche).length;
  const peutTirerSuivante = terminee && estDerniere && tournoi._count.parties < tournoi.nbPartiesMax;

  // Terrain 0 = exemption : on l'affiche en fin de liste, apres les terrains.
  const rencontres = [
    ...partie.rencontres.filter((r) => r.equipeB !== null),
    ...partie.rencontres.filter((r) => r.equipeB === null),
  ];

  return (
    <div className="space-y-4">
      {/* Seule chose imprimee sur cette page : l'affiche pour la salle. */}
      <AfficheTirage
        nomTournoi={tournoi.nom}
        date={tournoi.date}
        numeroPartie={partie.numero}
        rencontres={rencontres}
      />
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={sectionHeadingClass}>
            Partie {partie.numero}
            <span className={`ml-2 text-sm font-normal ${mutedClass}`}>
              {aJouer.length} terrain{aJouer.length > 1 ? "s" : ""}
              {terminee ? " · terminée" : ` · ${saisis}/${aJouer.length} scores saisis`}
            </span>
          </h2>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            {partie.numero === 1
              ? "Tirage au sort intégral."
              : "Gagnants contre gagnants, terrain 1 pour les mieux classés."}
            {revanches > 0 && (
              <span className="ml-2 text-warn">
                {revanches} revanche{revanches > 1 ? "s" : ""} inévitable
                {revanches > 1 ? "s" : ""}.
              </span>
            )}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <BoutonImprimer
            libelle={terminee ? "Imprimer les résultats" : "Imprimer le tirage"}
            title="Affiche A4 en gros caractères à afficher dans la salle : un terrain par ligne, puis la liste des équipes par numéro"
          />

          {estDerniere && aucunScore && (
            <FormulaireAction action={relancerTirage.bind(null, partie.id)}>
              <BoutonAction
                className={buttonSecondaryClass}
                confirmation="Relancer le tirage de cette partie ? Les terrains vont changer."
              >
                Relancer le tirage
              </BoutonAction>
            </FormulaireAction>
          )}

          {estDerniere && (
            <FormulaireAction action={supprimerPartie.bind(null, partie.id)}>
              <BoutonAction
                className={buttonDangerClass}
                confirmation={`Supprimer la partie ${partie.numero} et tous ses scores ? Une sauvegarde est faite juste avant.`}
              >
                Supprimer la partie
              </BoutonAction>
            </FormulaireAction>
          )}

          {peutTirerSuivante && (
            <FormulaireAction action={genererProchainePartie.bind(null, tournoiId)}>
              <BoutonAction
                confirmation={`Tirer la partie ${partie.numero + 1} ?

Les scores de la partie ${partie.numero} ne seront plus modifiables. Vérifiez-les avant de continuer.
(En cas d'erreur, il restera possible de supprimer la partie ${partie.numero + 1} ou de restaurer une sauvegarde.)`}
              >
                Tirer la partie {partie.numero + 1} →
              </BoutonAction>
            </FormulaireAction>
          )}

          {terminee && tournoi._count.parties >= tournoi.nbPartiesMax && estDerniere && (
            <Link href={`/tournois/${tournoiId}/classement`} className={buttonClass}>
              Classement final →
            </Link>
          )}
        </div>
      </div>

      <SaisieScores
        className="no-print"
        key={rencontres.map((r) => `${r.id}:${r.scoreA}:${r.scoreB}`).join("|")}
        rencontres={rencontres.map((r) => ({
          id: r.id,
          table: r.table,
          revanche: r.revanche,
          equipeA: r.equipeA,
          equipeB: r.equipeB,
          scoreA: r.scoreA,
          scoreB: r.scoreB,
        }))}
        scoreCible={tournoi.scoreCible}
        verrouille={!estDerniere}
        action={enregistrerScores.bind(null, partie.id)}
      />

      {!estDerniere && (
        <p className={`no-print text-xs ${mutedClass}`}>
          Cette partie est verrouillée car une partie suivante a déjà été tirée. Pour la corriger,
          supprimez d&apos;abord les parties suivantes ou restaurez une sauvegarde.
        </p>
      )}
    </div>
  );
}
