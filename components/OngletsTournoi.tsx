"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  tournoiId: number;
  parties: number[];
  nbPartiesMax: number;
};

export function OngletsTournoi({ tournoiId, parties, nbPartiesMax }: Props) {
  const chemin = usePathname();
  const base = `/tournois/${tournoiId}`;

  const onglets = [
    { href: base, libelle: "Tableau de bord" },
    { href: `${base}/equipes`, libelle: "Équipes" },
    ...parties.map((numero) => ({
      href: `${base}/parties/${numero}`,
      libelle: `Partie ${numero}`,
    })),
    { href: `${base}/classement`, libelle: "Classement" },
    { href: `${base}/sauvegardes`, libelle: "Sauvegardes" },
    { href: `${base}/parametres`, libelle: "Paramètres" },
  ];

  return (
    <nav className="no-print -mb-px flex flex-wrap items-end gap-1 border-b border-border">
      {onglets.map((onglet) => {
        const actif = chemin === onglet.href;
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            className={`rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors ${
              actif
                ? "border-accent font-medium text-accent-strong"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {onglet.libelle}
          </Link>
        );
      })}
      {parties.length < nbPartiesMax && (
        <span className="px-3 py-2 text-xs text-muted-2">
          {parties.length}/{nbPartiesMax} parties jouées
        </span>
      )}
    </nav>
  );
}
