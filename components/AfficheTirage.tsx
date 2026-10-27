/* eslint-disable @next/next/no-img-element */

type Equipe = { numero: number; nom: string };

export type RencontreAffiche = {
  table: number;
  revanche: boolean;
  equipeA: Equipe;
  equipeB: Equipe | null;
  scoreA: number | null;
  scoreB: number | null;
};

type Props = {
  nomTournoi: string;
  date: Date;
  numeroPartie: number;
  /// Terrains par numero croissant, exempte(s) en fin de liste.
  rencontres: RencontreAffiche[];
};

/// Affiche imprimable d'une partie, pensee pour etre lue de loin dans la
/// salle : numeros d'equipe en gros, un terrain par ligne, deux colonnes
/// au-dela de 16 terrains (32 terrains tiennent sur une page A4). Une seconde
/// page liste les equipes par numero pour qu'un joueur retrouve son terrain.
/// Invisible a l'ecran : voir `.affiche` dans app/globals.css. Une fois les
/// scores saisis, la meme affiche sert de feuille de resultats.
export function AfficheTirage({ nomTournoi, date, numeroPartie, rencontres }: Props) {
  const terrains = rencontres.filter((r) => r.equipeB !== null);
  const exemptes = rencontres.filter((r) => r.equipeB === null);
  const scoresSaisis = terrains.filter((r) => r.scoreA !== null && r.scoreB !== null).length;
  const resultats = terrains.length > 0 && scoresSaisis === terrains.length;
  const colonnes = terrains.length > 16 ? 2 : 1;
  const lignesParColonne = Math.max(1, Math.ceil(terrains.length / colonnes));

  const parEquipe = [
    ...terrains.flatMap((r) => [
      { equipe: r.equipeA, adversaire: r.equipeB, table: r.table },
      { equipe: r.equipeB as Equipe, adversaire: r.equipeA, table: r.table },
    ]),
    ...exemptes.map((r) => ({ equipe: r.equipeA, adversaire: null, table: 0 })),
  ].sort((x, y) => x.equipe.numero - y.equipe.numero);
  const colonnesIndex = 3;
  const lignesIndex = Math.max(1, Math.ceil(parEquipe.length / colonnesIndex));

  const dateTournoi = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const maintenant = new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="affiche">
      <header className="affiche-entete">
        <img src="/logo_acl.jpg" alt="" />
        <div>
          <p className="affiche-titre">{nomTournoi}</p>
          <p className="affiche-sous-titre">
            Partie {numeroPartie} — {resultats ? "Résultats" : "Tirage des terrains"} ·{" "}
            {terrains.length} terrain{terrains.length > 1 ? "s" : ""} · {dateTournoi}
          </p>
        </div>
      </header>

      <div
        className="affiche-terrains"
        data-colonnes={colonnes}
        style={{ gridTemplateRows: `repeat(${lignesParColonne}, auto)` }}
      >
        {terrains.map((r) => {
          const equipeB = r.equipeB as Equipe;
          const joue = r.scoreA !== null && r.scoreB !== null;
          const perdantA = joue && (r.scoreA as number) < (r.scoreB as number);
          const perdantB = joue && (r.scoreB as number) < (r.scoreA as number);
          return (
            <div key={r.table} className="affiche-ligne">
              <div className="affiche-terrain">
                <span>Terrain</span>
                {r.table}
              </div>
              <div className={`affiche-equipe${perdantA ? " affiche-perdant" : ""}`}>
                <span className="affiche-numero">{r.equipeA.numero}</span>
                <span className="affiche-nom">{r.equipeA.nom}</span>
              </div>
              <div className="affiche-score" data-vide={joue ? undefined : ""}>
                {joue ? `${r.scoreA} – ${r.scoreB}` : "contre"}
                {r.revanche && <small>revanche</small>}
              </div>
              <div className={`affiche-equipe${perdantB ? " affiche-perdant" : ""}`}>
                <span className="affiche-numero">{equipeB.numero}</span>
                <span className="affiche-nom">{equipeB.nom}</span>
              </div>
            </div>
          );
        })}
      </div>

      {exemptes.map((r) => (
        <p key={`exempte-${r.equipeA.numero}`} className="affiche-exempte">
          Équipe exempte pour cette partie : <strong>n° {r.equipeA.numero}</strong> {r.equipeA.nom} —
          victoire d&apos;office {r.scoreA} – {r.scoreB}.
        </p>
      ))}

      <p className="affiche-pied">
        {nomTournoi} · partie {numeroPartie} · édité le {maintenant}
      </p>

      <section className="affiche-index">
        <h2>
          Où joue mon équipe ? <span>Partie {numeroPartie}</span>
        </h2>
        <div
          className="affiche-index-grille"
          style={{ gridTemplateRows: `repeat(${lignesIndex}, auto)` }}
        >
          {parEquipe.map((e) => (
            <div key={e.equipe.numero} className="affiche-index-equipe">
              <span className="affiche-index-numero">{e.equipe.numero}</span>
              <span className="affiche-index-detail">
                <span className="affiche-index-nom">{e.equipe.nom}</span>
                <span>
                  {e.adversaire
                    ? `Terrain ${e.table} · contre le n° ${e.adversaire.numero}`
                    : "Exempte pour cette partie"}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
