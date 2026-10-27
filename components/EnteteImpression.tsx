/* eslint-disable @next/next/no-img-element */

/// En-tete visible uniquement a l'impression (feuille de terrains, classement).
/// <img> plutot que next/image : pas d'optimisation utile pour une page papier.
export function EnteteImpression({ titre, sousTitre }: { titre: string; sousTitre: string }) {
  return (
    <div className="hidden print:flex items-center gap-4 border-b border-black pb-3">
      <img src="/logo_acl.jpg" alt="" className="h-16 w-16" />
      <div>
        <p className="text-lg font-bold">{titre}</p>
        <p className="text-sm">{sousTitre}</p>
      </div>
    </div>
  );
}
