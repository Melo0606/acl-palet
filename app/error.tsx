"use client";

import { buttonClass, cardPadClass, mutedClass, sectionHeadingClass } from "@/lib/ui";

/// Les actions serveur signalent leurs refus par une exception avec un message
/// en francais (score invalide, partie incomplete...). On l'affiche tel quel.
export default function Erreur({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`${cardPadClass} mx-auto max-w-lg space-y-3 border-neg/30`}>
      <h2 className={`${sectionHeadingClass} text-neg`}>Action impossible</h2>
      <p className="text-sm">{error.message || "Une erreur inattendue s'est produite."}</p>
      <p className={`text-xs ${mutedClass}`}>Aucune donnée n&apos;a été modifiée.</p>
      <button type="button" onClick={reset} className={buttonClass}>
        Retour
      </button>
    </div>
  );
}
