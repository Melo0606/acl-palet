import { notFound } from "next/navigation";
import {
  creerSauvegardeManuelle,
  getSauvegardes,
  restaurer,
  supprimer,
} from "@/app/actions/sauvegardes";
import { prisma } from "@/lib/prisma";
import { BoutonAction } from "@/components/BoutonAction";
import { FormulaireAction } from "@/components/FormulaireAction";
import {
  badgeClass,
  buttonDangerSmallClass,
  buttonSecondaryClass,
  buttonSecondarySmallClass,
  cardClass,
  cardPadClass,
  helpTextClass,
  inputClass,
  labelClass,
  mutedClass,
  sectionHeadingClass,
  tableClass,
  tdClass,
  thClass,
  theadRowClass,
  trHoverClass,
} from "@/lib/ui";

function formaterTaille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export default async function PageSauvegardes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournoiId = Number(id);

  const tournoi = await prisma.tournoi.findUnique({ where: { id: tournoiId } });
  if (!tournoi) notFound();

  // On montre aussi les sauvegardes globales (avant restauration) : elles
  // concernent tous les tournois et sont donc pertinentes ici.
  const toutes = await getSauvegardes();
  const sauvegardes = toutes.filter((s) => s.tournoiId === tournoiId || s.tournoiId === null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h2 className={sectionHeadingClass}>
          {sauvegardes.length} point{sauvegardes.length > 1 ? "s" : ""} de restauration
        </h2>

        {sauvegardes.length === 0 ? (
          <p className={`${cardPadClass} text-sm ${mutedClass}`}>
            Aucune sauvegarde pour l&apos;instant. Elles se créent automatiquement à chaque saisie
            de scores et avant chaque tirage.
          </p>
        ) : (
          <div className={`${cardClass} overflow-x-auto`}>
            <table className={tableClass}>
              <thead>
                <tr className={theadRowClass}>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Moment</th>
                  <th className={`${thClass} w-20`}>Type</th>
                  <th className={`${thClass} w-20 text-right`}>Taille</th>
                  <th className={`${thClass} w-44 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sauvegardes.map((s) => (
                  <tr key={s.fichier} className={trHoverClass}>
                    <td className={`${tdClass} whitespace-nowrap tabular-nums`}>
                      {s.date.toLocaleDateString("fr-FR")}{" "}
                      <span className={mutedClass}>
                        {s.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </td>
                    <td className={`${tdClass} font-medium`}>{s.libelle}</td>
                    <td className={tdClass}>
                      <span
                        className={`${badgeClass} ${
                          s.type === "jalon" ? "bg-accent-soft text-accent-strong" : "bg-surface-muted text-muted"
                        }`}
                      >
                        {s.type === "jalon" ? "Jalon" : "Auto"}
                      </span>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums ${mutedClass}`}>
                      {formaterTaille(s.taille)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <FormulaireAction action={restaurer.bind(null, s.fichier)}>
                          <BoutonAction
                            className={buttonSecondarySmallClass}
                            confirmation={`Revenir à l'état « ${s.libelle} » du ${s.date.toLocaleString("fr-FR")} ?\n\nTout ce qui a été saisi depuis sera perdu (l'état actuel est lui-même sauvegardé juste avant).`}
                          >
                            Restaurer
                          </BoutonAction>
                        </FormulaireAction>
                        <FormulaireAction action={supprimer.bind(null, tournoiId, s.fichier)}>
                          <BoutonAction
                            className={buttonDangerSmallClass}
                            confirmation="Supprimer définitivement ce point de restauration ?"
                          >
                            Supprimer
                          </BoutonAction>
                        </FormulaireAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className={`${cardPadClass} space-y-3`}>
          <h2 className={sectionHeadingClass}>Sauvegarde manuelle</h2>
          <FormulaireAction action={creerSauvegardeManuelle.bind(null, tournoiId)} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="libelle">
                Libellé
              </label>
              <input
                id="libelle"
                name="libelle"
                className={inputClass}
                placeholder="Avant la pause déjeuner"
              />
            </div>
            <BoutonAction className={`${buttonSecondaryClass} w-full`}>
              Sauvegarder maintenant
            </BoutonAction>
          </FormulaireAction>
        </section>

        <section className={`${cardPadClass} space-y-2 text-sm`}>
          <h2 className={sectionHeadingClass}>Comment ça marche</h2>
          <p className={mutedClass}>
            Une copie complète de la base est prise <strong className="text-text">après chaque
            saisie de scores</strong> et <strong className="text-text">avant chaque tirage</strong>{" "}
            ou suppression de partie.
          </p>
          <p className={mutedClass}>
            Les <strong className="text-text">jalons</strong> (fin de partie, avant tirage,
            manuelles) sont conservés indéfiniment. Les sauvegardes <strong className="text-text">auto</strong>{" "}
            (saisies intermédiaires) sont limitées aux 60 plus récentes.
          </p>
          <p className={helpTextClass}>
            Fichiers dans <code>data/sauvegardes/</code>, à côté de la base.
          </p>
        </section>
      </aside>
    </div>
  );
}
