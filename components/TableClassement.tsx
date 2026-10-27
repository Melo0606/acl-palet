import type { StatEquipe } from "@/lib/tournoi";
import { cardClass, mutedClass, tableClass, tdClass, thClass, theadRowClass, trHoverClass } from "@/lib/ui";

/// Les trois premieres places sont mises en avant : or, argent, bronze.
const couleurPodium = ["text-or", "text-muted", "text-warn"];

export function TableClassement({
  classement,
  complet = false,
}: {
  classement: StatEquipe[];
  complet?: boolean;
}) {
  if (classement.length === 0) {
    return <p className={`${cardClass} p-4 text-sm ${mutedClass}`}>Aucune équipe inscrite.</p>;
  }

  return (
    <div className={`${cardClass} print-plein overflow-x-auto`}>
      <table className={tableClass}>
        <thead>
          <tr className={theadRowClass}>
            <th className={`${thClass} w-12 text-center`}>Pl.</th>
            <th className={thClass}>Équipe</th>
            <th className={`${thClass} w-14 text-center`} title="Matchs joués">
              J
            </th>
            <th className={`${thClass} w-14 text-center`} title="Victoires">
              V
            </th>
            <th className={`${thClass} w-14 text-center`} title="Défaites">
              D
            </th>
            {complet && (
              <>
                <th className={`${thClass} w-24 text-center`} title="Total des points marqués">
                  Pts marqués
                </th>
                <th className={`${thClass} w-24 text-center`} title="Total des points encaissés">
                  Pts encaissés
                </th>
              </>
            )}
            <th className={`${thClass} w-20 text-center`} title="Goal-average : points marqués − points encaissés">
              Goal-av.
            </th>
          </tr>
        </thead>
        <tbody>
          {classement.map((equipe, index) => (
            <tr key={equipe.id} className={`${trHoverClass} ${equipe.forfait ? "opacity-50" : ""}`}>
              <td
                className={`${tdClass} text-center font-semibold tabular-nums ${
                  couleurPodium[index] ?? ""
                }`}
              >
                {index + 1}
              </td>
              <td className={tdClass}>
                <span className="inline-block min-w-8 text-base font-bold tabular-nums">{equipe.numero}</span>{" "}
                <span className={mutedClass}>{equipe.nom}</span>
                {equipe.forfait && (
                  <span className="ml-2 rounded-full bg-neg-soft px-2 py-0.5 text-xs font-medium text-neg">
                    forfait
                  </span>
                )}
                {equipe.exempts > 0 && (
                  <span
                    className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn"
                    title="Victoire acquise sans adversaire (effectif impair)"
                  >
                    {equipe.exempts} exempt{equipe.exempts > 1 ? "s" : ""}
                  </span>
                )}
              </td>
              <td className={`${tdClass} text-center tabular-nums`}>{equipe.joues}</td>
              <td className={`${tdClass} text-center font-semibold tabular-nums text-pos`}>
                {equipe.victoires}
              </td>
              <td className={`${tdClass} text-center tabular-nums ${mutedClass}`}>
                {equipe.defaites}
              </td>
              {complet && (
                <>
                  <td className={`${tdClass} text-center tabular-nums`}>{equipe.marques}</td>
                  <td className={`${tdClass} text-center tabular-nums`}>{equipe.encaisses}</td>
                </>
              )}
              <td
                className={`${tdClass} text-center font-medium tabular-nums ${
                  equipe.goalAverage > 0 ? "text-pos" : equipe.goalAverage < 0 ? "text-neg" : ""
                }`}
              >
                {equipe.goalAverage > 0 ? "+" : ""}
                {equipe.goalAverage}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
