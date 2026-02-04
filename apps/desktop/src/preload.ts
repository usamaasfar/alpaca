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

  // Servers
  searchRemoteMCPServers: (term: string) => ipcRenderer.invoke("search-remote-mcp-servers", term),

  // // AI Composition
  // aiCompose: (prompt: string, mentions?: string[]) => ipcRenderer.send("ai-compose", prompt, mentions),
  // onAIStep: (callback: (step: any) => void) => {
  //   ipcRenderer.on("ai-step", (_event, step) => callback(step));
  // },
  // onAIComplete: (callback: (result: any) => void) => {
  //   ipcRenderer.on("ai-complete", (_event, result) => callback(result));
  // },
  // onAIError: (callback: (error: any) => void) => {
  //   ipcRenderer.on("ai-error", (_event, error) => callback(error));
  // },

  // // MCP
  // searchMCPServers: (term: string) => ipcRenderer.invoke("search-mcp-servers", term),
  // connectMCPServer: (serverConfig: any) => ipcRenderer.invoke("connect-mcp-server", serverConfig),
  // finishMCPAuth: (authCode: string, serverMetadata: any) => ipcRenderer.invoke("finish-mcp-auth", authCode, serverMetadata),
  // disconnectMCPServer: (namespace: string) => ipcRenderer.invoke("disconnect-mcp-server", namespace),
  // listConnectedMCPs: () => ipcRenderer.invoke("list-connected-mcps"),
  // onMCPOAuthCallback: (callback: (data: { code: string; state: string }) => void) => {
  //   ipcRenderer.on("mcp-oauth-callback", (_event, data) => callback(data));
  // },
  // removeAllOAuthListeners: () => {
  //   ipcRenderer.removeAllListeners("mcp-oauth-callback");
  // },

  // // System
  openExternalLink: (url: string) => ipcRenderer.invoke("open-external-link", url),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
