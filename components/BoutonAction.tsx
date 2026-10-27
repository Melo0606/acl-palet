"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/lib/ui";
import { DialogueConfirmation } from "./DialogueConfirmation";

type Props = {
  children: React.ReactNode;
  className?: string;
  /// Message de confirmation affiche avant l'envoi. Sans lui, pas de garde-fou.
  confirmation?: string;
  disabled?: boolean;
  title?: string;
};

/// Bouton de soumission d'un <form action={serverAction}>. Il se desactive
/// pendant l'envoi pour eviter un double tirage ou un double enregistrement.
/// La confirmation passe par un <dialog> HTML, jamais par window.confirm()
/// (voir DialogueConfirmation).
export function BoutonAction({ children, className, confirmation, disabled, title }: Props) {
  const { pending } = useFormStatus();
  const bouton = useRef<HTMLButtonElement>(null);
  const [confirmationDemandee, setConfirmationDemandee] = useState(false);

  return (
    <>
      <button
        ref={bouton}
        type="submit"
        title={title}
        disabled={pending || disabled}
        className={className ?? buttonClass}
        onClick={(evenement) => {
          if (!confirmation) return;
          evenement.preventDefault();
          setConfirmationDemandee(true);
        }}
      >
        {pending ? "…" : children}
      </button>
      {confirmation && (
        <DialogueConfirmation
          ouvert={confirmationDemandee}
          message={confirmation}
          onAnnuler={() => setConfirmationDemandee(false)}
          onConfirmer={() => {
            setConfirmationDemandee(false);
            // requestSubmit(bouton) soumet le formulaire avec ce bouton comme
            // origine sans redeclencher son onClick : pas de boucle.
            bouton.current?.form?.requestSubmit(bouton.current);
          }}
        />
      )}
    </>
  );
}
