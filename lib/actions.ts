/// Resultat d'une action serveur : `undefined` si tout s'est bien passe, sinon
/// le message a afficher a l'utilisateur.
export type ResultatAction = { erreur: string } | undefined;

/// En production, Next.js remplace le message des exceptions levees par une
/// action serveur par un texte generique. Les refus metier (score invalide,
/// effectif complet, partie incomplete...) doivent donc revenir comme valeur
/// pour etre affiches tels quels dans le formulaire.
export async function executer(fn: () => Promise<void>): Promise<ResultatAction> {
  try {
    await fn();
    return undefined;
  } catch (cause) {
    // redirect() et notFound() fonctionnent par exception : on les laisse passer.
    const digest = (cause as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw cause;
    return { erreur: cause instanceof Error ? cause.message : "Action impossible." };
  }
}
