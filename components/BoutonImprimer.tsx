"use client";

import { buttonSecondaryClass } from "@/lib/ui";

declare global {
  interface Window {
    /// Expose par electron/preload.ts dans l'application de bureau.
    aclPalet?: { imprimer: () => Promise<void> };
  }
}

/// Impression de la page courante : affiche de tirage ou classement. Les
/// elements marques `no-print` disparaissent a l'impression.
/// Dans l'application de bureau, l'impression passe par le processus
/// principal Electron, qui rend le focus a la fenetre une fois le dialogue
/// d'impression ferme (sinon les champs restent inselectionnables).
export function BoutonImprimer({ libelle = "Imprimer", title }: { libelle?: string; title?: string }) {
  function imprimer() {
    if (window.aclPalet) void window.aclPalet.imprimer();
    else window.print();
  }

  return (
    <button type="button" title={title} className={buttonSecondaryClass} onClick={imprimer}>
      {libelle}
    </button>
  );
}
