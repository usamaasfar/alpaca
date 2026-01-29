import { contextBridge, ipcRenderer } from 'electron';

// Custom APIs for renderer
const electronAPI = {
  // MCP OAuth functions
  getAvailableMCPs: () => ipcRenderer.invoke('get-available-mcps'),
  connectMCP: (mcpName: string) => ipcRenderer.invoke('connect-mcp', mcpName),
  finishOAuth: (mcpName: string, authCode: string) => ipcRenderer.invoke('finish-oauth', mcpName, authCode),
  getConnectedMCPs: () => ipcRenderer.invoke('get-connected-mcps'),
  
  // OAuth callback listener
  onOAuthCallback: (callback: (code: string) => void) => {
    ipcRenderer.on('oauth-callback', (_, code) => callback(code));
  },
  
  // AI generation
  generateWithMCP: (prompt: string) => ipcRenderer.send('generate-with-mcp', prompt),
  onAgentStep: (callback: (step: string) => void) => {
    ipcRenderer.on('agent-step', (_, step) => callback(step));
  },
  onGenerateComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('generate-complete', (_, result) => callback(result));
  },
  onGenerateError: (callback: (result: any) => void) => {
    ipcRenderer.on('generate-error', (_, result) => callback(result));
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
