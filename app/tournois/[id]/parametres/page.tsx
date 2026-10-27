import { notFound } from "next/navigation";
import { deleteTournoi, updateTournoi } from "@/app/actions/tournois";
import { prisma } from "@/lib/prisma";
import { BoutonAction } from "@/components/BoutonAction";
import { FormulaireAction } from "@/components/FormulaireAction";
import { NB_EQUIPES_MAX, nbTerrainsPour } from "@/lib/tournoi";
import {
  buttonDangerClass,
  cardPadClass,
  helpTextClass,
  inputClass,
  labelClass,
  mutedClass,
  sectionHeadingClass,
} from "@/lib/ui";

export default async function PageParametres({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournoiId = Number(id);

  const tournoi = await prisma.tournoi.findUnique({
    where: { id: tournoiId },
    include: { _count: { select: { equipes: true, parties: true } } },
  });
  if (!tournoi) notFound();

  const commence = tournoi._count.parties > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[480px_1fr]">
      <section className={`${cardPadClass} space-y-3`}>
        <h2 className={sectionHeadingClass}>Paramètres du tournoi</h2>
        <FormulaireAction action={updateTournoi.bind(null, tournoiId)} className="space-y-3">
          <div className="space-y-1">
            <label className={labelClass} htmlFor="nom">
              Nom
            </label>
            <input id="nom" name="nom" required defaultValue={tournoi.nom} className={inputClass} />
          </div>

          <div className="space-y-1">
            <label className={labelClass} htmlFor="date">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date(tournoi.date).toISOString().slice(0, 10)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="nbEquipesMax">
                Équipes
              </label>
              <input
                id="nbEquipesMax"
                name="nbEquipesMax"
                type="number"
                min={Math.max(2, tournoi._count.equipes)}
                max={NB_EQUIPES_MAX}
                defaultValue={tournoi.nbEquipesMax}
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
                min={Math.max(1, tournoi._count.parties)}
                max={12}
                defaultValue={tournoi.nbPartiesMax}
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
                defaultValue={tournoi.scoreCible}
                className={inputClass}
                disabled={commence}
              />
            </div>
          </div>

          <p className={helpTextClass}>
            {tournoi.nbEquipesMax} équipes → {nbTerrainsPour(tournoi.nbEquipesMax)} terrains.{" "}
            {commence
              ? "Le nombre de points pour gagner ne se modifie plus une fois le tournoi commencé."
              : "L'effectif ne peut pas descendre sous le nombre d'équipes déjà inscrites."}
          </p>

          <BoutonAction className="w-full justify-center rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-50">
            Enregistrer
          </BoutonAction>
        </FormulaireAction>
      </section>

      <section className={`${cardPadClass} h-fit space-y-3`}>
        <h2 className={sectionHeadingClass}>Zone dangereuse</h2>
        <p className={`text-sm ${mutedClass}`}>
          Supprime le tournoi, ses {tournoi._count.equipes} équipes et ses {tournoi._count.parties}{" "}
          parties. Les sauvegardes sur disque sont conservées et permettent de le retrouver.
        </p>
        <FormulaireAction action={deleteTournoi.bind(null, tournoiId)}>
          <BoutonAction
            className={buttonDangerClass}
            confirmation={`Supprimer définitivement le tournoi « ${tournoi.nom} » ?`}
          >
            Supprimer le tournoi
          </BoutonAction>
        </FormulaireAction>
      </section>
    </div>
  );
}
