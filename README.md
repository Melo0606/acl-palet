# ACL Palet

Gestion d'un tournoi de palet vendéen au **système suisse** : jusqu'à 64 équipes
sur 32 terrains, 5 parties, sans jamais rejouer le même duel.

## Installer l'application (Windows)

1. Ouvrir la page [Releases](https://github.com/Melo0606/acl-palet/releases/latest)
   et télécharger `ACL-Palet-Setup-<version>.exe`.
2. Lancer le fichier. L'installateur n'est pas signé : Windows affiche
   « Windows a protégé votre ordinateur » → *Informations complémentaires* →
   *Exécuter quand même*.
3. L'application s'installe et s'ouvre ; un raccourci est créé sur le bureau.

Les mises à jour sont proposées automatiquement au démarrage (ou via
*Aide › Rechercher des mises à jour…*) : elles ne touchent ni aux tournois ni
aux sauvegardes.

## Règles implémentées

- **Partie 1** : tirage au sort intégral.
- **Parties suivantes** : tirage au sort *à l'intérieur* de chaque groupe de
  même nombre de victoires — gagnants contre gagnants, perdants contre perdants,
  2 victoires contre 2 victoires, etc. Un groupe impair fait descendre une
  équipe dans le groupe suivant.
- **Pas de revanche** : un backtracking évite de refaire jouer deux équipes qui
  se sont déjà rencontrées. Si c'est mathématiquement impossible (très petit
  effectif), il minimise le nombre de revanches et les signale.
- **Terrains** : le terrain 1 reçoit les équipes les mieux classées, le dernier
  terrain les plus en difficulté. Le nombre de terrains utilisés s'adapte à
  l'effectif (63 équipes → 31 terrains + 1 exempte).
- **Effectif impair** : une équipe est exempte, choisie dans le groupe le plus
  faible parmi celles qui ne l'ont pas encore été. Elle est créditée d'une
  victoire au score cible.
- **Classement** : victoires, puis goal-average (points marqués − points encaissés),
  puis palets marqués.
- **Score** : une partie se gagne en atteignant le nombre de points fixé (13 par
  défaut) ; le match nul est refusé car le système suisse a besoin d'un gagnant
  par rencontre.

## Sauvegardes

Une copie complète de la base SQLite est prise automatiquement :

- **après chaque saisie de scores** (sauvegarde *auto*, 60 dernières conservées) ;
- **à la fin de chaque partie**, **avant chaque tirage** et **avant chaque
  suppression** (sauvegardes *jalon*, conservées indéfiniment).

L'onglet **Sauvegardes** d'un tournoi permet de revenir à n'importe quel point.
L'état courant est lui-même archivé juste avant une restauration, qui reste
donc annulable. Les fichiers sont dans `data/sauvegardes/`.

## Logo

Le logo du club (ACL Basket Longué) est attendu dans `public/logo_acl.jpg` : il
sert dans l'en-tête, comme favicon et sur les feuilles imprimées.

## Démarrer

```bash
cp .env.example .env     # chemin de la base de développement
npm install              # génère aussi le client Prisma
npx prisma migrate dev   # crée data/acl-palet.db au premier lancement
npm run dev          # http://localhost:3000
```

Production locale : `npm run build && npm start`.

## Application Windows (.exe)

```bash
npm run dist:win
```

Produit `dist-app/ACL-Palet-Setup-<version>.exe` (installateur NSIS en un clic,
raccourcis bureau et menu Démarrer). L'application embarque le serveur Next.js
(`output: standalone`) dans Electron ; `scripts/build-desktop.js` recompile
`better-sqlite3` pour l'ABI Electron et `electron/migrate.ts` applique les
migrations Prisma au démarrage sans le CLI.

Les données (`acl-palet.db` et `sauvegardes/`) sont dans
`%APPDATA%\acl-palet\donnees` — menu *Fichier › Ouvrir le dossier des données*.

### Publier une version

1. Monter la version : `npm version X.Y.Z --no-git-tag-version`.
2. `npm run dist:win`.
3. Commit, tag `vX.Y.Z`, puis
   `gh release create vX.Y.Z dist-app/ACL-Palet-Setup-X.Y.Z.exe --notes "…"`.

L'application installée lit la dernière release du dépôt
(`electron/mise-a-jour.ts`, sans electron-updater) : elle prend l'asset
`*Setup*.exe`, vérifie son empreinte SHA-256 fournie par GitHub, puis lance
l'installateur après sa fermeture. Le dépôt doit rester public, sinon l'API
GitHub répond 404 et aucune mise à jour n'est proposée.

Après un `dist:win`, `better-sqlite3` reste compilé pour Electron : lancer
`npm rebuild better-sqlite3` avant de reprendre `npm run dev`.

Pas de `window.confirm()` / `alert()` dans l'interface : sous Electron/Windows,
ces dialogues natifs laissent la fenêtre sans focus clavier et les champs de
saisie deviennent insélectionnables jusqu'au redémarrage. Les confirmations
passent par `components/DialogueConfirmation.tsx` (un `<dialog>` HTML) et
l'impression par `electron/preload.ts` → processus principal, qui rend le focus
à la fenêtre après le dialogue d'impression.

## Le jour du tournoi

1. **Accueil** → créer le tournoi (nom, date, nombre d'équipes attendues — les
   terrains en découlent —, nombre de parties, points pour gagner).
2. **Équipes** → un nom libre par équipe (prénom nom, ou nom d'équipe) ; le
   **numéro** est attribué automatiquement dans l'ordre d'inscription (1, 2, 3…)
   et resserré si une équipe est supprimée avant le début. Import en masse : une
   ligne par équipe. Les tirages et feuilles de terrains n'affichent que les numéros.
3. **Tableau de bord** → *Tirer la partie 1*.
4. **Partie N** → *Imprimer le tirage* : une affiche A4 en gros caractères pour
   la salle (un terrain par ligne, 32 terrains sur une page) suivie d'une page
   « Où joue mon équipe ? » classée par numéro d'équipe. Le même bouton imprime
   les résultats une fois les scores saisis.
5. **Partie N** → saisir le score du **perdant** sur chaque terrain, l'autre
   champ se complète à 13. *Enregistrer* (possible au fil de l'eau).
6. Quand tous les scores sont saisis → *Tirer la partie N+1*.
7. **Classement** → imprimable à tout moment ; définitif après la dernière partie.

Une équipe qui abandonne se déclare **forfait** dans l'onglet Équipes : elle
garde ses résultats mais n'est plus appariée. Tant qu'aucun score n'est saisi,
un tirage peut être **relancé**.

## Stack

Next.js 16 (App Router, server actions) · React 19 · Prisma 7 + SQLite
(`better-sqlite3`) · Tailwind CSS 4. Même base technique que `site-compta`.

- `lib/tournoi.ts` — moteur pur (classement + appariement), sans dépendance,
  testable isolément.
- `lib/sauvegarde.ts` — snapshots `VACUUM INTO` et restauration.
- `app/actions/*` — actions serveur (tournois, équipes, parties, sauvegardes).
