"use server";

import { executer } from "@/lib/actions";
import { revalidatePath } from "next/cache";
import {
  creerSauvegarde,
  listerSauvegardes,
  restaurerSauvegarde,
  supprimerSauvegarde,
} from "@/lib/sauvegarde";

export async function getSauvegardes(tournoiId?: number) {
  return listerSauvegardes(tournoiId);
}

export async function creerSauvegardeManuelle(tournoiId: number, formData: FormData) {
  return executer(async () => {
    const libelle = String(formData.get("libelle") ?? "").trim() || "Sauvegarde manuelle";
    await creerSauvegarde(tournoiId, libelle, "jalon");
    revalidatePath("/tournois/" + tournoiId + "/sauvegardes");
  });
}

export async function restaurer(fichier: string) {
  return executer(async () => {
    await restaurerSauvegarde(fichier);
    // Toute la base a change : on invalide l'integralite du rendu en cache.
    revalidatePath("/", "layout");
  });
}

export async function supprimer(tournoiId: number, fichier: string) {
  return executer(async () => {
    await supprimerSauvegarde(fichier);
    revalidatePath("/tournois/" + tournoiId + "/sauvegardes");
  });
}
