import { contextBridge, ipcRenderer } from "electron";

// Pont minimal renderer -> processus principal. Le renderer est isole
// (contextIsolation) : seules ces fonctions sont visibles depuis la page,
// sous window.aclPalet (voir components/BoutonImprimer.tsx).
contextBridge.exposeInMainWorld("aclPalet", {
  imprimer: (): Promise<void> => ipcRenderer.invoke("imprimer"),
});
