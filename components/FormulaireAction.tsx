"use client";

import { useActionState } from "react";
import type { ResultatAction } from "@/lib/actions";

type Props = {
  action: (formData: FormData) => Promise<ResultatAction>;
  children: React.ReactNode;
  className?: string;
};

/// <form> branche sur une action serveur qui renvoie ses refus comme valeur
/// (voir lib/actions.ts). Le message s'affiche sous le formulaire ; le bouton
/// (BoutonAction) garde son etat "en cours" via useFormStatus.
export function FormulaireAction({ action, children, className }: Props) {
  const [etat, soumettre] = useActionState(
    async (_precedent: ResultatAction, formData: FormData) => action(formData),
    undefined,
  );

  return (
    <form action={soumettre} className={className}>
      {children}
      {etat?.erreur && (
        <p role="alert" className="mt-2 text-sm font-medium text-neg">
          {etat.erreur}
        </p>
      )}
    </form>
  );
}
