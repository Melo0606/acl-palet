"use client";

import { useState, useTransition } from "react";
import type { ResultatAction } from "@/lib/actions";
import {
  buttonClass,
  cardClass,
  inputClass,
  mutedClass,
  tableClass,
  tdClass,
  thClass,
  theadRowClass,
  trHoverClass,
} from "@/lib/ui";

export type LigneRencontre = {
  id: number;
  table: number;
  revanche: boolean;
  equipeA: { numero: number; nom: string };
  equipeB: { numero: number; nom: string } | null;
  scoreA: number | null;
  scoreB: number | null;
};

type Props = {
  rencontres: LigneRencontre[];
  scoreCible: number;
  verrouille: boolean;
  action: (formData: FormData) => Promise<ResultatAction>;
  className?: string;
};

/// Les tirages se lisent par numero d'equipe : gros, lisible de loin. Le nom
/// n'apparait qu'au survol, pour l'organisateur.
function Numero({ equipe, gagnant = false }: { equipe: { numero: number; nom: string }; gagnant?: boolean }) {
  return (
    <span
      title={equipe.nom}
      className={`inline-flex h-9 min-w-11 items-center justify-center rounded-lg border px-2 text-lg font-bold tabular-nums ${
        gagnant ? "border-pos/40 bg-pos-soft text-pos" : "border-border bg-surface-muted text-text"
      }`}
    >
      {equipe.numero}
    </span>
  );
}

export function SaisieScores({ rencontres, scoreCible, verrouille, action, className }: Props) {
  const [scores, setScores] = useState(() =>
    Object.fromEntries(
      rencontres.map((r) => [
        r.id,
        { a: r.scoreA?.toString() ?? "", b: r.scoreB?.toString() ?? "" },
      ]),
    ),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const aJouer = rencontres.filter((r) => r.equipeB !== null);
  const saisis = aJouer.filter((r) => scores[r.id]?.a !== "" && scores[r.id]?.b !== "").length;

  function modifier(id: number, cote: "a" | "b", valeur: string) {
    if (valeur !== "" && !/^\d{1,3}$/.test(valeur)) return;
    setScores((precedent) => ({ ...precedent, [id]: { ...precedent[id], [cote]: valeur } }));
  }

  // Au palet, le vainqueur atteint le score cible : on ne saisit donc que le
  // score du perdant, et le champ d'en face se complete tout seul.
  function completer(id: number, cote: "a" | "b") {
    setScores((precedent) => {
      const ligne = precedent[id];
      const autre = cote === "a" ? "b" : "a";
      if (ligne[cote] === "" || ligne[autre] !== "") return precedent;
      if (Number(ligne[cote]) >= scoreCible) return precedent;
      return { ...precedent, [id]: { ...ligne, [autre]: String(scoreCible) } };
    });
  }

  function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const formData = new FormData(evenement.currentTarget);
    setErreur(null);
    demarrer(async () => {
      try {
        const resultat = await action(formData);
        if (resultat?.erreur) setErreur(resultat.erreur);
      } catch (cause) {
        setErreur(cause instanceof Error ? cause.message : "Enregistrement impossible.");
      }
    });
  }

  return (
    <form onSubmit={envoyer} className={`space-y-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${mutedClass}`}>
          {saisis} / {aJouer.length} terrains saisis
        </p>
        <div className="no-print flex items-center gap-2">
          {erreur && <p className="text-sm font-medium text-neg">{erreur}</p>}
          <button type="submit" className={buttonClass} disabled={enCours || verrouille}>
            {enCours ? "Enregistrement…" : "Enregistrer les scores"}
          </button>
        </div>
      </div>

      <div className={`${cardClass} print-plein overflow-x-auto`}>
        <table className={tableClass}>
          <thead>
            <tr className={theadRowClass}>
              <th className={`${thClass} w-16 text-center`}>Terrain</th>
              <th className={`${thClass} text-right`}>N° équipe</th>
              <th className={`${thClass} w-20 text-center`}>Score</th>
              <th className={`${thClass} w-4`} />
              <th className={`${thClass} w-20 text-center`}>Score</th>
              <th className={thClass}>N° équipe</th>
            </tr>
          </thead>
          <tbody>
            {rencontres.map((rencontre) => {
              if (rencontre.equipeB === null) {
                return (
                  <tr key={rencontre.id} className="bg-warn-soft/50">
                    <td className={`${tdClass} text-center text-xs font-semibold uppercase text-warn`}>
                      Exempt
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Numero equipe={rencontre.equipeA} />
                    </td>
                    <td className={`${tdClass} text-center font-semibold`}>{rencontre.scoreA}</td>
                    <td className={`${tdClass} text-center ${mutedClass}`}>–</td>
                    <td className={`${tdClass} text-center font-semibold`}>{rencontre.scoreB}</td>
                    <td className={`${tdClass} ${mutedClass} italic`}>
                      Exempte — victoire d&apos;office
                    </td>
                  </tr>
                );
              }

              const ligne = scores[rencontre.id];
              const gagnantA = ligne.a !== "" && ligne.b !== "" && Number(ligne.a) > Number(ligne.b);
              const gagnantB = ligne.a !== "" && ligne.b !== "" && Number(ligne.b) > Number(ligne.a);

              return (
                <tr key={rencontre.id} className={trHoverClass}>
                  <td className={`${tdClass} text-center`}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-sm font-semibold text-accent-strong">
                      {rencontre.table}
                    </span>
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <Numero equipe={rencontre.equipeA} gagnant={gagnantA} />
                    {rencontre.revanche && (
                      <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                        revanche
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} text-center`}>
                    <input
                      name={`scoreA-${rencontre.id}`}
                      value={ligne.a}
                      onChange={(e) => modifier(rencontre.id, "a", e.target.value)}
                      onBlur={() => completer(rencontre.id, "a")}
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={verrouille}
                      className={`${inputClass} w-16 text-center font-semibold`}
                    />
                  </td>
                  <td className={`${tdClass} text-center ${mutedClass}`}>–</td>
                  <td className={`${tdClass} text-center`}>
                    <input
                      name={`scoreB-${rencontre.id}`}
                      value={ligne.b}
                      onChange={(e) => modifier(rencontre.id, "b", e.target.value)}
                      onBlur={() => completer(rencontre.id, "b")}
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={verrouille}
                      className={`${inputClass} w-16 text-center font-semibold`}
                    />
                  </td>
                  <td className={tdClass}>
                    <Numero equipe={rencontre.equipeB} gagnant={gagnantB} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={`no-print text-xs ${mutedClass}`}>
        Saisissez le score du perdant : le champ d&apos;en face se complète à {scoreCible}.
      </p>
    </form>
  );
}
