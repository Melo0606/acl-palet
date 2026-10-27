// Moteur du tournoi : classement et appariement systeme suisse.
// Volontairement sans dependance a Prisma pour rester testable isolement.

/// Contrainte physique de la salle : 32 terrains, donc 64 equipes au plus.
export const NB_TERRAINS_MAX = 32;
export const NB_EQUIPES_MAX = NB_TERRAINS_MAX * 2;

/// Terrains necessaires pour un effectif donne : 2 equipes par terrain.
export function nbTerrainsPour(nbEquipes: number) {
  return Math.ceil(nbEquipes / 2);
}

export type RencontreJouee = {
  equipeAId: number;
  equipeBId: number | null;
  scoreA: number | null;
  scoreB: number | null;
};

export type EquipeBrute = {
  id: number;
  numero: number;
  nom: string;
  forfait: boolean;
};

export type StatEquipe = {
  id: number;
  numero: number;
  nom: string;
  forfait: boolean;
  /// Rencontres terminees, exemptions comprises.
  joues: number;
  victoires: number;
  defaites: number;
  exempts: number;
  marques: number;
  encaisses: number;
  goalAverage: number;
  /// Ids des equipes deja rencontrees (hors exemption).
  adversaires: number[];
};

/// Cle stable pour memoriser un affrontement, quel que soit l'ordre des equipes.
function cleDuel(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function calculerStats(
  equipes: EquipeBrute[],
  rencontres: RencontreJouee[],
): StatEquipe[] {
  const stats = new Map<number, StatEquipe>();
  for (const e of equipes) {
    stats.set(e.id, {
      id: e.id,
      numero: e.numero,
      nom: e.nom,
      forfait: e.forfait,
      joues: 0,
      victoires: 0,
      defaites: 0,
      exempts: 0,
      marques: 0,
      encaisses: 0,
      goalAverage: 0,
      adversaires: [],
    });
  }

  for (const r of rencontres) {
    if (r.scoreA === null || r.scoreB === null) continue; // rencontre non saisie
    const a = stats.get(r.equipeAId);
    if (!a) continue;

    if (r.equipeBId === null) {
      // Exemption : l'equipe marque le score convenu face a un adversaire fictif.
      a.joues += 1;
      a.victoires += 1;
      a.exempts += 1;
      a.marques += r.scoreA;
      a.encaisses += r.scoreB;
      continue;
    }

    const b = stats.get(r.equipeBId);
    if (!b) continue;

    a.joues += 1;
    b.joues += 1;
    a.marques += r.scoreA;
    a.encaisses += r.scoreB;
    b.marques += r.scoreB;
    b.encaisses += r.scoreA;
    a.adversaires.push(b.id);
    b.adversaires.push(a.id);

    if (r.scoreA > r.scoreB) {
      a.victoires += 1;
      b.defaites += 1;
    } else if (r.scoreB > r.scoreA) {
      b.victoires += 1;
      a.defaites += 1;
    }
  }

  for (const s of stats.values()) {
    s.goalAverage = s.marques - s.encaisses;
  }

  return [...stats.values()].sort(comparerClassement);
}

/// Victoires, puis goal-average, puis palets marques, puis numero de dossard.
export function comparerClassement(a: StatEquipe, b: StatEquipe) {
  if (a.victoires !== b.victoires) return b.victoires - a.victoires;
  if (a.goalAverage !== b.goalAverage) return b.goalAverage - a.goalAverage;
  if (a.marques !== b.marques) return b.marques - a.marques;
  return a.numero - b.numero;
}

function melanger<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export type Paire = {
  /// Numero de terrain : 1 pour les equipes les mieux classees, puis par ordre
  /// decroissant de victoires jusqu'au dernier terrain pour les plus en
  /// difficulte.
  table: number;
  equipeAId: number;
  equipeBId: number;
  revanche: boolean;
};

type PaireSansTable = Omit<Paire, "table">;

export type Appariement = {
  paires: Paire[];
  exemptId: number | null;
  /// Nombre de paires qui rejouent un duel deja dispute.
  nbRevanches: number;
};

/// Budget de noeuds explores : borne le backtracking sur les gros tableaux.
const BUDGET_NOEUDS = 300_000;

/**
 * Appariement d'une partie.
 *
 * Partie 1 : tirage au sort integral.
 * Parties suivantes : tirage au sort a l'interieur de chaque groupe de meme
 * nombre de victoires (gagnants contre gagnants, perdants contre perdants,
 * 2 victoires contre 2 victoires, etc.). Les groupes impairs font "descendre"
 * une equipe dans le groupe suivant. Un backtracking evite de rejouer un duel
 * deja dispute ; si c'est impossible, il minimise le nombre de revanches.
 */
export function apparier(stats: StatEquipe[], premierePartie: boolean): Appariement {
  const actifs = stats.filter((e) => !e.forfait);
  if (actifs.length < 2) return { paires: [], exemptId: null, nbRevanches: 0 };

  // Ordre de base : groupes de victoires decroissants, tirage au sort dedans.
  let ordonnees: StatEquipe[];
  if (premierePartie) {
    ordonnees = melanger(actifs);
  } else {
    const groupes = new Map<number, StatEquipe[]>();
    for (const e of actifs) {
      const groupe = groupes.get(e.victoires);
      if (groupe) groupe.push(e);
      else groupes.set(e.victoires, [e]);
    }
    ordonnees = [...groupes.keys()]
      .sort((a, b) => b - a)
      .flatMap((victoires) => melanger(groupes.get(victoires)!));
  }

  // Effectif impair : une equipe est exempte. On la prend dans le groupe le
  // plus faible, parmi celles qui n'ont pas encore ete exemptees.
  let exemptId: number | null = null;
  if (ordonnees.length % 2 === 1) {
    const minVictoires = Math.min(...ordonnees.map((e) => e.victoires));
    const dernierGroupe = ordonnees.filter((e) => e.victoires === minVictoires);
    const minExempts = Math.min(...dernierGroupe.map((e) => e.exempts));
    const eligibles = dernierGroupe.filter((e) => e.exempts === minExempts);
    const exempt = melanger(eligibles)[0];
    exemptId = exempt.id;
    ordonnees = ordonnees.filter((e) => e.id !== exempt.id);
  }

  const dejaJoue = new Set<string>();
  for (const e of actifs) {
    for (const adv of e.adversaires) dejaJoue.add(cleDuel(e.id, adv));
  }

  const resolu =
    resoudre(ordonnees, dejaJoue, false) ?? resoudre(ordonnees, dejaJoue, true) ?? secours(ordonnees, dejaJoue);

  // `resoudre` apparie toujours la meilleure equipe restante en premier : les
  // paires sortent donc deja par force decroissante, et l'index donne le terrain.
  const paires = resolu.map((paire, index) => ({ ...paire, table: index + 1 }));

  return {
    paires,
    exemptId,
    nbRevanches: paires.filter((p) => p.revanche).length,
  };
}

/**
 * Backtracking : on apparie toujours la premiere equipe restante de la liste
 * avec l'adversaire le plus proche possible dans l'ordre du classement, ce qui
 * maintient le principe gagnant contre gagnant tout en respectant le tirage.
 * `autoriserRevanche` n'est active qu'en second recours.
 */
function resoudre(
  ordonnees: StatEquipe[],
  dejaJoue: Set<string>,
  autoriserRevanche: boolean,
): PaireSansTable[] | null {
  let noeuds = 0;

  function explorer(restantes: StatEquipe[]): PaireSansTable[] | null {
    if (restantes.length === 0) return [];
    if (noeuds++ > BUDGET_NOEUDS) return null;

    const [a, ...autres] = restantes;
    // Les candidats sont deja tries par proximite de classement ; en mode
    // tolerant on essaie d'abord ceux qui n'ont jamais affronte `a`.
    const candidats = autoriserRevanche
      ? [
          ...autres.filter((c) => !dejaJoue.has(cleDuel(a.id, c.id))),
          ...autres.filter((c) => dejaJoue.has(cleDuel(a.id, c.id))),
        ]
      : autres.filter((c) => !dejaJoue.has(cleDuel(a.id, c.id)));

    for (const b of candidats) {
      const suite = explorer(autres.filter((c) => c.id !== b.id));
      if (suite === null) {
        if (noeuds > BUDGET_NOEUDS) return null;
        continue;
      }
      return [
        { equipeAId: a.id, equipeBId: b.id, revanche: dejaJoue.has(cleDuel(a.id, b.id)) },
        ...suite,
      ];
    }
    return null;
  }

  return explorer(ordonnees);
}

/// Dernier recours si meme le mode tolerant epuise son budget : appariement
/// deux a deux dans l'ordre, pour ne jamais bloquer le deroulement du tournoi.
function secours(ordonnees: StatEquipe[], dejaJoue: Set<string>): PaireSansTable[] {
  const paires: PaireSansTable[] = [];
  for (let i = 0; i + 1 < ordonnees.length; i += 2) {
    const a = ordonnees[i];
    const b = ordonnees[i + 1];
    paires.push({ equipeAId: a.id, equipeBId: b.id, revanche: dejaJoue.has(cleDuel(a.id, b.id)) });
  }
  return paires;
}
