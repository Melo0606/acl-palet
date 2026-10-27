import Link from "next/link";
import { createTournoi, deleteTournoi, getTournois } from "@/app/actions/tournois";
import { BoutonAction } from "@/components/BoutonAction";
import { FormulaireAction } from "@/components/FormulaireAction";
import { NB_EQUIPES_MAX, nbTerrainsPour } from "@/lib/tournoi";
import {
  badgeClass,
  buttonDangerSmallClass,
  cardPadClass,
  helpTextClass,
  inputClass,
  labelClass,
  mutedClass,
  pageHeadingClass,
  sectionHeadingClass,
} from "@/lib/ui";

const libelleStatut = {
  INSCRIPTIONS: { texte: "Inscriptions", classe: "bg-accent-soft text-accent-strong" },
  EN_COURS: { texte: "En cours", classe: "bg-warn-soft text-warn" },
  TERMINE: { texte: "Terminé", classe: "bg-pos-soft text-pos" },
} as const;

export default async function Accueil() {
  const tournois = await getTournois();
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeadingClass}>Tournois</h1>
        <p className={`mt-1 text-sm ${mutedClass}`}>
          Appariement au système suisse : gagnants contre gagnants, sans jamais rejouer le même duel.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          {tournois.length === 0 && (
            <p className={`${cardPadClass} text-sm ${mutedClass}`}>
              Aucun tournoi pour le moment. Créez-en un pour commencer.
            </p>
          )}

          {tournois.map((tournoi) => {
            const statut = libelleStatut[tournoi.statut];
            return (
              <div
                key={tournoi.id}
                className={`${cardPadClass} flex items-center justify-between gap-4 transition-colors hover:border-accent`}
              >
                <Link href={`/tournois/${tournoi.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{tournoi.nom}</p>
                  <p className={`mt-0.5 text-sm ${mutedClass}`}>
                    {new Date(tournoi.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className={mutedClass}>
                    {tournoi._count.equipes} équipes · {tournoi._count.parties}/
                    {tournoi.nbPartiesMax} parties
                  </span>
                  <span className={`${badgeClass} ${statut.classe}`}>{statut.texte}</span>
                  <FormulaireAction action={deleteTournoi.bind(null, tournoi.id)}>
                    <BoutonAction
                      className={buttonDangerSmallClass}
                      confirmation={`Supprimer définitivement « ${tournoi.nom} » (${tournoi._count.equipes} équipes, ${tournoi._count.parties} parties) ?\n\nLes sauvegardes sur disque sont conservées.`}
                    >
                      Supprimer
                    </BoutonAction>
                  </FormulaireAction>
                </div>
              </div>
            );
          })}
        </section>

        <section className={`${cardPadClass} h-fit space-y-3`}>
          <h2 className={sectionHeadingClass}>Nouveau tournoi</h2>
          <FormulaireAction action={createTournoi} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="nom">
                Nom
              </label>
              <input id="nom" name="nom" required className={inputClass} placeholder="Tournoi ACL 2026" />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="date">
                Date
              </label>
              <input id="date" name="date" type="date" defaultValue={aujourdhui} className={inputClass} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className={labelClass} htmlFor="nbEquipesMax">
                  Équipes
                </label>
                <input
                  id="nbEquipesMax"
                  name="nbEquipesMax"
                  type="number"
                  min={2}
                  max={NB_EQUIPES_MAX}
                  defaultValue={NB_EQUIPES_MAX}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor="nbPartiesMax">
                  Parties
                </label>
                <input
                  id="nbPartiesMax"
                  name="nbPartiesMax"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={5}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass} htmlFor="scoreCible">
                  Victoire à
                </label>
                <input
                  id="scoreCible"
                  name="scoreCible"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={13}
                  className={inputClass}
                />
              </div>
            </div>

            <p className={helpTextClass}>
              Le nombre de terrains se déduit de l&apos;effectif, 2 équipes par terrain :{" "}
              {NB_EQUIPES_MAX} équipes → {nbTerrainsPour(NB_EQUIPES_MAX)} terrains. Une partie se
              gagne en atteignant le nombre de points indiqué.
            </p>

            <BoutonAction className="w-full justify-center rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50">
              Créer le tournoi
            </BoutonAction>
          </FormulaireAction>
        </section>
      </div>
    </div>
  );
}
