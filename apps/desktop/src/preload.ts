import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  // Storage
  setStorage: (key: string, value: any) => ipcRenderer.invoke("set-storage", key, value),
  getStorage: (key: string) => ipcRenderer.invoke("get-storage", key),
  setSecureStorage: (key: string, value: any) => ipcRenderer.invoke("set-secure-storage", key, value),
  getSecureStorage: (key: string) => ipcRenderer.invoke("get-secure-storage", key),

  // Providers
  getOllamaHealth: () => ipcRenderer.invoke("get-ollama-health"),
  getOllamaModels: () => ipcRenderer.invoke("get-ollama-models"),

  // MCP Remote Servers
  searchRemoteMCPServers: (term: string) => ipcRenderer.invoke("search-remote-mcp-servers", term),
  connectRemoteServer: (server: any) => ipcRenderer.invoke("connect-remote-server", server),
  disconnectRemoteServer: (namespace: string) => ipcRenderer.invoke("disconnect-remote-server", namespace),
  listConnectedRemoteServers: () => ipcRenderer.invoke("list-connected-remote-servers"),
  completeMCPOAuth: (namespace: string, authCode: string) => ipcRenderer.invoke("complete-mcp-oauth", namespace, authCode),
  onMCPOAuthCallback: (callback: (data: { code: string; state: string }) => void) => {
    ipcRenderer.on("mcp-oauth-callback", (_event, data) => callback(data));
  },

  // System
  openExternalLink: (url: string) => ipcRenderer.invoke("open-external-link", url),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
