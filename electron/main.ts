import { app, BrowserWindow, Menu, dialog, ipcMain, shell, type WebContents } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { get as httpGet } from "node:http";
import { createServer } from "node:net";
import { join } from "node:path";
import { appliquerMigrations, migrationsInconnues } from "./migrate";
import { chercherMiseAJour, resumerNotes, telechargerInstallateur, type MiseAJour } from "./mise-a-jour";

// Champs <input type="date"> natifs en format français, quelle que soit la
// langue de Windows.
app.commandLine.appendSwitch("lang", "fr");

/// Base et sauvegardes vivent dans le dossier de données de l'application
/// (%APPDATA%\ACL Palet) : lib/sauvegarde.ts range les sauvegardes a cote du
/// fichier .db, elles y atterrissent donc naturellement.
function dossierDonnees(): string {
  return join(app.getPath("userData"), "donnees");
}

function cheminLogServeur(): string {
  return join(app.getPath("userData"), "server.log");
}

function journaliserCrash(source: string, erreur: unknown): void {
  const message = `[${source}] ${erreur instanceof Error ? erreur.stack ?? erreur.message : String(erreur)}\n`;
  try {
    appendFileSync(join(app.getPath("userData"), "crash.log"), message);
  } catch {
    // best effort
  }
  dialog.showErrorBox("Erreur fatale", message);
  app.exit(1);
}

process.on("uncaughtException", (erreur) => journaliserCrash("uncaughtException", erreur));
process.on("unhandledRejection", (erreur) => journaliserCrash("unhandledRejection", erreur));

let fenetrePrincipale: BrowserWindow | null = null;
let serveurNext: ChildProcess | null = null;
/// Arret demande par l'application (fermeture) : la sortie du serveur n'est
/// alors pas une erreur a signaler.
let arretServeurVolontaire = false;
/// Installateur telecharge, a lancer une fois l'application fermee.
let installateurEnAttente: string | null = null;
let verificationMajEnCours = false;

function dossierMigrations(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "migrations")
    : join(__dirname, "..", "prisma", "migrations");
}

function dossierServeurStandalone(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "standalone")
    : join(__dirname, "..", ".next", "standalone");
}

/** Trouve un port TCP libre sur 127.0.0.1. */
function portLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const serveur = createServer();
    serveur.listen(0, "127.0.0.1", () => {
      const adresse = serveur.address();
      if (adresse && typeof adresse === "object") {
        const { port } = adresse;
        serveur.close(() => resolve(port));
      } else {
        serveur.close(() => reject(new Error("Impossible de trouver un port libre.")));
      }
    });
    serveur.on("error", reject);
  });
}

function attendreServeurPret(port: number, delaiMaxMs = 20000): Promise<void> {
  const debut = Date.now();
  return new Promise((resolve, reject) => {
    const essayer = () => {
      const requete = httpGet({ host: "127.0.0.1", port, path: "/", timeout: 1000 }, (res) => {
        res.destroy();
        resolve();
      });
      requete.on("error", () => {
        if (Date.now() - debut > delaiMaxMs) {
          reject(new Error("Le serveur local n'a pas démarré à temps."));
        } else {
          setTimeout(essayer, 300);
        }
      });
    };
    essayer();
  });
}

async function demarrerServeurNext(cheminBase: string): Promise<number> {
  const port = await portLibre();
  const dossierServeur = dossierServeurStandalone();
  const scriptServeur = join(dossierServeur, "server.js");

  if (!existsSync(scriptServeur)) {
    throw new Error(`Build serveur introuvable : ${scriptServeur}`);
  }

  const cheminLog = cheminLogServeur();
  const flotLog = createWriteStream(cheminLog, { flags: "w" });

  // Le serveur Next tourne dans le runtime Node embarque d'Electron
  // (ELECTRON_RUN_AS_NODE), avec le meme binaire better-sqlite3 recompile.
  serveurNext = spawn(process.execPath, [scriptServeur], {
    cwd: dossierServeur,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${cheminBase}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serveurNext.stdout?.pipe(flotLog, { end: false });
  serveurNext.stderr?.pipe(flotLog, { end: false });

  serveurNext.on("exit", (code) => {
    flotLog.end();
    if (!arretServeurVolontaire && code !== 0 && code !== null) {
      dialog.showErrorBox(
        "Erreur",
        `Le serveur local s'est arrêté de façon inattendue (code ${code}).\n\nDétails : ${cheminLog}`,
      );
      app.exit(1);
    }
  });

  await attendreServeurPret(port);
  return port;
}

/// Impression pilotee par le processus principal plutot que window.print()
/// dans la page : une fois le dialogue natif ferme, Chromium laisse parfois la
/// fenetre sans focus clavier (champs inselectionnables tant que l'application
/// n'est pas relancee). On le lui rend explicitement, et on remonte les echecs
/// reels (pas les annulations) au lieu de les avaler en silence.
function imprimer(contenu: WebContents): Promise<void> {
  const fenetre = BrowserWindow.fromWebContents(contenu);
  return new Promise((resolve) => {
    contenu.print({ printBackground: true }, (succes, raison) => {
      if (fenetre && !fenetre.isDestroyed()) {
        fenetre.blur();
        fenetre.focus();
        fenetre.webContents.focus();
      }
      if (!succes && raison && !/cancel/i.test(raison) && fenetre) {
        dialog.showMessageBox(fenetre, {
          type: "error",
          title: "Impression impossible",
          message: `L'impression a échoué : ${raison}`,
        });
      }
      resolve();
    });
  });
}

/** Arrete le serveur Next et attend sa sortie (la base est alors liberee). */
function arreterServeur(delaiMaxMs = 5000): Promise<void> {
  const serveur = serveurNext;
  if (!serveur || serveur.exitCode !== null || serveur.signalCode !== null) return Promise.resolve();
  arretServeurVolontaire = true;
  return new Promise((resolve) => {
    const minuterie = setTimeout(resolve, delaiMaxMs);
    serveur.once("exit", () => {
      clearTimeout(minuterie);
      resolve();
    });
    serveur.kill();
  });
}

function messageErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

async function afficherMessage(options: Electron.MessageBoxOptions): Promise<number> {
  const parent = fenetrePrincipale && !fenetrePrincipale.isDestroyed() ? fenetrePrincipale : null;
  const { response } = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options);
  return response;
}

function barreProgression(fraction: number): void {
  if (fenetrePrincipale && !fenetrePrincipale.isDestroyed()) fenetrePrincipale.setProgressBar(fraction);
}

/**
 * Cherche une version plus recente dans les releases GitHub et propose de
 * l'installer. Au demarrage, ne dit rien s'il n'y en a pas ou si GitHub est
 * injoignable ; depuis le menu (ou quand la base vient d'une version plus
 * recente), l'indique. Si l'utilisateur accepte, telecharge l'installateur
 * puis ferme l'application : l'installateur est lance a la toute fin de la
 * fermeture, une fois le serveur arrete. Retourne `true` si l'application se
 * ferme pour installer.
 */
async function verifierMisesAJour(contexte: "demarrage" | "menu" | "base-plus-recente"): Promise<boolean> {
  if (verificationMajEnCours || installateurEnAttente) return false;
  verificationMajEnCours = true;
  const titre = "Mise à jour d'ACL Palet";
  try {
    let maj: MiseAJour | null;
    try {
      maj = await chercherMiseAJour(app.getVersion());
    } catch (erreur) {
      if (contexte !== "demarrage") {
        await afficherMessage({
          type: "error",
          title: titre,
          message: "Impossible de vérifier les mises à jour.",
          detail: `Vérifiez la connexion internet, puis réessayez.\n\n${messageErreur(erreur)}`,
          buttons: ["OK"],
          noLink: true,
        });
      }
      return false;
    }

    if (!maj) {
      if (contexte === "menu") {
        await afficherMessage({
          type: "info",
          title: titre,
          message: "ACL Palet est à jour.",
          detail: `Version installée : ${app.getVersion()}.`,
          buttons: ["OK"],
          noLink: true,
        });
      } else if (contexte === "base-plus-recente") {
        await afficherMessage({
          type: "warning",
          title: titre,
          message: "Aucune mise à jour n'a été trouvée en ligne.",
          detail: "Installez à la main la dernière version d'ACL Palet, puis rouvrez l'application.",
          buttons: ["Quitter"],
          noLink: true,
        });
      }
      return false;
    }

    const notes = resumerNotes(maj.notes);
    const reponse = await afficherMessage({
      type: "info",
      title: titre,
      message: `La version ${maj.version} d'ACL Palet est disponible.`,
      detail:
        `Version installée : ${app.getVersion()}.\n\n` +
        (notes ? `${notes}\n\n` : "") +
        "L'installation ferme l'application, la met à jour sans toucher aux tournois ni aux sauvegardes, puis la rouvre.",
      buttons: ["Installer maintenant", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (reponse !== 0) return false;

    let chemin: string;
    try {
      chemin = await telechargerInstallateur(
        maj.installateur,
        join(app.getPath("temp"), "acl-palet-mise-a-jour"),
        barreProgression,
      );
    } catch (erreur) {
      await afficherMessage({
        type: "error",
        title: titre,
        message: "Le téléchargement de la mise à jour a échoué.",
        detail: `Rien n'a été modifié. Vous pourrez réessayer depuis le menu Aide.\n\n${messageErreur(erreur)}`,
        buttons: ["OK"],
        noLink: true,
      });
      return false;
    } finally {
      barreProgression(-1);
    }

    installateurEnAttente = chemin;
    app.quit();
    return true;
  } finally {
    verificationMajEnCours = false;
  }
}

/**
 * Lance l'installateur NSIS detache de l'application. `--updated` : il attend
 * la fin de l'application au lieu de demander de la fermer ; `--force-run` :
 * il la relance une fois installee.
 */
function lancerInstallateur(chemin: string): void {
  try {
    const installateur = spawn(chemin, ["--updated", "--force-run"], { detached: true, stdio: "ignore" });
    installateur.on("error", (erreur) => {
      appendFileSync(join(app.getPath("userData"), "crash.log"), `[mise à jour] ${messageErreur(erreur)}\n`);
    });
    installateur.unref();
  } catch (erreur) {
    dialog.showErrorBox(
      "Mise à jour d'ACL Palet",
      `L'installateur n'a pas pu être lancé : ${messageErreur(erreur)}\n\nIl se trouve ici : ${chemin}`,
    );
  }
}

function construireMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Fichier",
      submenu: [
        {
          label: "Imprimer la page…",
          accelerator: "CmdOrCtrl+P",
          click: (_item, fenetre) => {
            const cible = fenetre instanceof BrowserWindow ? fenetre : fenetrePrincipale;
            if (cible) void imprimer(cible.webContents);
          },
        },
        {
          label: "Ouvrir le dossier des données (base et sauvegardes)",
          click: () => shell.openPath(dossierDonnees()),
        },
        { type: "separator" },
        { role: "quit", label: "Quitter" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Recharger" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom normal" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arrière" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
        { role: "toggleDevTools", label: "Outils de développement" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        { label: "Rechercher des mises à jour…", click: () => void verifierMisesAJour("menu") },
        { type: "separator" },
        { label: `Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function demarrer(): Promise<void> {
  const dossier = dossierDonnees();
  mkdirSync(dossier, { recursive: true });
  const cheminBase = join(dossier, "acl-palet.db");

  // Base deja migree par une version plus recente (application reinstallee
  // dans une version plus ancienne) : l'ouvrir risquerait d'abimer les donnees.
  if (migrationsInconnues(cheminBase, dossierMigrations()).length > 0) {
    const reponse = await afficherMessage({
      type: "warning",
      title: "ACL Palet",
      message: "Les données ont été enregistrées par une version plus récente d'ACL Palet.",
      detail:
        `Version installée : ${app.getVersion()}.\n\n` +
        "Mettez l'application à jour avant de l'ouvrir : cette version ne connaît pas encore la dernière " +
        "structure des données, et les ouvrir risquerait de les abîmer.",
      buttons: ["Mettre à jour", "Quitter"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (reponse === 0 && (await verifierMisesAJour("base-plus-recente"))) return;
    app.exit(0);
    return;
  }

  appliquerMigrations(cheminBase, dossierMigrations());
  construireMenu();
  ipcMain.handle("imprimer", (evenement) => imprimer(evenement.sender));

  let port: number;
  try {
    port = await demarrerServeurNext(cheminBase);
  } catch (erreur) {
    dialog.showErrorBox("Erreur au démarrage", String(erreur));
    app.exit(1);
    return;
  }

  fenetrePrincipale = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "ACL Palet",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.js"),
    },
  });
  if (app.isPackaged) {
    // Quelques secondes apres l'affichage, pour ne pas ralentir le demarrage.
    fenetrePrincipale.webContents.once("did-finish-load", () => {
      setTimeout(() => void verifierMisesAJour("demarrage"), 3000);
    });
  }
  fenetrePrincipale.loadURL(`http://127.0.0.1:${port}`);
}

// Une seule instance : deux fenetres (et deux serveurs) sur la meme base se
// marcheraient dessus. Un second lancement remet la fenetre existante devant.
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on("second-instance", () => {
    if (!fenetrePrincipale) return;
    if (fenetrePrincipale.isMinimized()) fenetrePrincipale.restore();
    fenetrePrincipale.focus();
  });
  app.whenReady().then(demarrer);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Fermeture : on attend la sortie du serveur (qui tient la base) avant de
// quitter, et avant de lancer un eventuel installateur de mise a jour.
let fermetureTerminee = false;
let fermetureEnCours = false;
app.on("before-quit", (evenement) => {
  if (fermetureTerminee) return;
  evenement.preventDefault();
  if (fermetureEnCours) return;
  fermetureEnCours = true;
  arreterServeur().finally(() => {
    fermetureTerminee = true;
    if (installateurEnAttente) lancerInstallateur(installateurEnAttente);
    app.quit();
  });
});
