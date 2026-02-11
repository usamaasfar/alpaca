import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  // Storage
  setStorage: (key: string, value: any) => ipcRenderer.invoke("set-storage", key, value),
  getStorage: (key: string) => ipcRenderer.invoke("get-storage", key),


  // MCP Remote Servers
  searchRemoteMCPServers: (term: string) => ipcRenderer.invoke("search-remote-mcp-servers", term),
  connectRemoteServer: (server: any) => ipcRenderer.invoke("connect-remote-server", server),
  disconnectRemoteServer: (namespace: string) => ipcRenderer.invoke("disconnect-remote-server", namespace),
  listConnectedRemoteServers: () => ipcRenderer.invoke("list-connected-remote-servers"),
  completeMCPOAuth: (namespace: string, authCode: string) => ipcRenderer.invoke("complete-mcp-oauth", namespace, authCode),
  onMCPOAuthCallback: (callback: (data: { code: string; state: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on("mcp-oauth-callback", listener);
    return () => ipcRenderer.removeListener("mcp-oauth-callback", listener);
  },
  onMCPReconnectStatus: (callback: (status: { type: string; namespace?: string; total?: number; connected?: number }) => void) => {
    const listener = (_event: any, status: any) => callback(status);
    ipcRenderer.on("mcp-reconnect-status", listener);
    return () => ipcRenderer.removeListener("mcp-reconnect-status", listener);
  },

  // AI Composer
  aiCompose: (prompt: string | null, mentions?: string[], messages?: any[]) => ipcRenderer.send("ai-compose", prompt, mentions, messages),
  onAIStep: (callback: (step: any) => void) => {
    ipcRenderer.on("ai-step", (_event, step) => callback(step));
  },
  onAIComplete: (callback: (result: any) => void) => {
    ipcRenderer.on("ai-complete", (_event, result) => callback(result));
  },
  onAIError: (callback: (error: any) => void) => {
    ipcRenderer.on("ai-error", (_event, error) => callback(error));
  },

  // System
  openExternalLink: (url: string) => ipcRenderer.invoke("open-external-link", url),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
