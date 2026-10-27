// Genere build/icon.png (512x512) a partir du logo du club, via nativeImage
// d'Electron : pas d'outil image externe a installer sur le poste de build.
const { app, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.whenReady().then(() => {
  const racine = path.join(__dirname, "..");
  const img = nativeImage
    .createFromPath(path.join(racine, "public", "logo_acl.jpg"))
    .resize({ width: 512, height: 512 });
  fs.mkdirSync(path.join(racine, "build"), { recursive: true });
  fs.writeFileSync(path.join(racine, "build", "icon.png"), img.toPNG());
  console.log("build/icon.png genere :", img.getSize());
  app.quit();
});
