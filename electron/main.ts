import { app, BrowserWindow, Menu, dialog, ipcMain, shell, type WebContents } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { get as httpGet } from "node:http";
import { createServer } from "node:net";
import { join } from "node:path";
import { appliquerMigrations } from "./migrate";

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
    if (code !== 0 && code !== null) {
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
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function demarrer(): Promise<void> {
  const dossier = dossierDonnees();
  mkdirSync(dossier, { recursive: true });
  const cheminBase = join(dossier, "acl-palet.db");

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
  fenetrePrincipale.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(demarrer);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serveurNext) serveurNext.kill();
});
