"use client";

import { useEffect, useRef } from "react";
import { buttonClass, buttonSecondaryClass } from "@/lib/ui";

type Props = {
  ouvert: boolean;
  message: string;
  libelleConfirmer?: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
};

/// Boite de confirmation en HTML (<dialog>) a la place de window.confirm().
/// Sous Electron/Windows, les dialogues natifs (alert, confirm) rendent la
/// fenetre sans focus clavier : les champs de saisie deviennent
/// inselectionnables jusqu'au redemarrage de l'application.
export function DialogueConfirmation({
  ouvert,
  message,
  libelleConfirmer = "Confirmer",
  onConfirmer,
  onAnnuler,
}: Props) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const boutonConfirmer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialogue.current;
    if (!element) return;
    if (ouvert && !element.open) {
      element.showModal();
      // Comme window.confirm : Entree valide, Echap annule.
      boutonConfirmer.current?.focus();
    } else if (!ouvert && element.open) {
      element.close();
    }
  }, [ouvert]);

  return (
    <dialog
      ref={dialogue}
      onClose={onAnnuler}
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-border bg-surface p-5 text-text shadow-[var(--shadow-pop)] backdrop:bg-black/40"
    >
      <p className="whitespace-pre-line text-sm leading-relaxed">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={buttonSecondaryClass} onClick={onAnnuler}>
          Annuler
        </button>
        <button ref={boutonConfirmer} type="button" className={buttonClass} onClick={onConfirmer}>
          {libelleConfirmer}
        </button>
      </div>
    </dialog>
  );
}
