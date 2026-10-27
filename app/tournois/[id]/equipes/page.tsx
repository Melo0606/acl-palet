import { notFound } from "next/navigation";
import {
  basculerForfait,
  createEquipe,
  deleteEquipe,
  importerEquipes,
  updateEquipe,
} from "@/app/actions/equipes";
import { prisma } from "@/lib/prisma";
import { BoutonAction } from "@/components/BoutonAction";
import { FormulaireAction } from "@/components/FormulaireAction";
import {
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

export default async function PageEquipes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournoiId = Number(id);

  const tournoi = await prisma.tournoi.findUnique({
    where: { id: tournoiId },
    include: {
      equipes: { orderBy: { numero: "asc" } },
      _count: { select: { parties: true } },
    },
  });
  if (!tournoi) notFound();

  const commence = tournoi._count.parties > 0;
  const maximum = tournoi.nbEquipesMax;
  const restantes = maximum - tournoi.equipes.length;
  const prochainNumero = tournoi.equipes.length + 1;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={sectionHeadingClass}>
            {tournoi.equipes.length} équipe{tournoi.equipes.length > 1 ? "s" : ""} inscrite
            {tournoi.equipes.length > 1 ? "s" : ""}
          </h2>
          <p className={helpTextClass}>
            {restantes > 0 ? `${restantes} places restantes` : "Effectif complet"} (max {maximum})
          </p>
        </div>

        {tournoi.equipes.length === 0 ? (
          <p className={`${cardPadClass} text-sm ${mutedClass}`}>
            Aucune équipe. Utilisez l&apos;import en masse pour coller votre liste d&apos;un coup.
          </p>
        ) : (
          <div className={`${cardClass} overflow-x-auto`}>
            <table className={tableClass}>
              <thead>
                <tr className={theadRowClass}>
                  <th className={`${thClass} w-16 text-center`}>N°</th>
                  <th className={thClass}>Nom</th>
                  <th className={`${thClass} w-44 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournoi.equipes.map((equipe) => (
                  <tr
                    key={equipe.id}
                    className={`${trHoverClass} ${equipe.forfait ? "opacity-60" : ""}`}
                  >
                    <td className={`${tdClass} text-center text-lg font-bold tabular-nums`}>
                      {equipe.numero}
                    </td>
                    <td className={tdClass}>
                      {commence ? (
                        <span className="font-medium">
                          {equipe.nom}
                          {equipe.forfait && (
                            <span className="ml-2 rounded-full bg-neg-soft px-2 py-0.5 text-xs font-medium text-neg">
                              forfait
                            </span>
                          )}
                        </span>
                      ) : (
                        // Le nom reste corrigeable jusqu'au premier tirage.
                        <FormulaireAction
                          action={updateEquipe.bind(null, equipe.id)}
                          className="flex items-center gap-2"
                        >
                          <input
                            name="nom"
                            defaultValue={equipe.nom}
                            required
                            aria-label="Nom"
                            className={`${inputClass} flex-1`}
                          />
                          <BoutonAction className={buttonSecondarySmallClass} title="Enregistrer le nom">
                            OK
                          </BoutonAction>
                        </FormulaireAction>
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <FormulaireAction action={basculerForfait.bind(null, equipe.id)}>
                          <BoutonAction
                            className={buttonSecondarySmallClass}
                            confirmation={
                              equipe.forfait
                                ? undefined
                                : `Déclarer l'équipe n° ${equipe.numero} (${equipe.nom}) forfait ? Elle conserve ses résultats mais ne sera plus appariée.`
                            }
                          >
                            {equipe.forfait ? "Réintégrer" : "Forfait"}
                          </BoutonAction>
                        </FormulaireAction>
                        {!commence && (
                          <FormulaireAction action={deleteEquipe.bind(null, equipe.id)}>
                            <BoutonAction
                              className={buttonDangerSmallClass}
                              confirmation={`Supprimer l'équipe n° ${equipe.numero} (${equipe.nom}) ? Les équipes suivantes seront renumérotées.`}
                            >
                              Supprimer
                            </BoutonAction>
                          </FormulaireAction>
                        )}
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
        {commence ? (
          <p className={`${cardPadClass} text-sm ${mutedClass}`}>
            Le tournoi a commencé : numéros et liste sont figés, puisque les tirages reposent
            dessus. Une équipe qui abandonne doit être déclarée{" "}
            <strong className="text-text">forfait</strong> — elle garde ses résultats acquis et
            n&apos;est plus appariée aux parties suivantes.
          </p>
        ) : (
          <>
            <section className={`${cardPadClass} space-y-3`}>
              <h2 className={sectionHeadingClass}>Ajouter une équipe</h2>
              <FormulaireAction action={createEquipe.bind(null, tournoiId)} className="space-y-3">
                <div className="space-y-1">
                  <label className={labelClass} htmlFor="nom">
                    Nom — recevra le n° {prochainNumero}
                  </label>
                  <input
                    id="nom"
                    name="nom"
                    required
                    className={inputClass}
                    placeholder="Jean Dupont ou Les Palets d'Or"
                  />
                </div>
                <p className={helpTextClass}>
                  Texte libre : prénom et nom d&apos;un joueur, ou nom d&apos;équipe. Le numéro
                  est attribué automatiquement dans l&apos;ordre d&apos;inscription.
                </p>
                <BoutonAction className={`${buttonSecondaryClass} w-full`}>Ajouter</BoutonAction>
              </FormulaireAction>
            </section>

            <section className={`${cardPadClass} space-y-3`}>
              <h2 className={sectionHeadingClass}>Import en masse</h2>
              <FormulaireAction action={importerEquipes.bind(null, tournoiId)} className="space-y-3">
                <textarea
                  name="liste"
                  rows={8}
                  required
                  className={`${inputClass} font-mono text-xs`}
                  placeholder={"Jean Dupont\nLes Palets d'Or\nMarie Martin"}
                />
                <p className={helpTextClass}>
                  Une équipe par ligne, numérotées dans l&apos;ordre de la liste à partir du n°{" "}
                  {prochainNumero}.
                </p>
                <BoutonAction className={`${buttonSecondaryClass} w-full`}>Importer</BoutonAction>
              </FormulaireAction>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
