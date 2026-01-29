export interface ElectronAPI {
  // MCP OAuth functions
  getAvailableMCPs: () => Promise<Array<{ name: string; url: string }>>;
  connectMCP: (mcpName: string) => Promise<{ success: boolean; needsAuth?: boolean; tools?: any[] }>;
  finishOAuth: (mcpName: string, authCode: string) => Promise<{ success: boolean; tools?: any[] }>;
  getConnectedMCPs: () => Promise<string[]>;
  
  // OAuth callback listener
  onOAuthCallback: (callback: (code: string) => void) => void;
  
  // AI generation
  generateWithMCP: (prompt: string) => void;
  onAgentStep: (callback: (step: string) => void) => void;
  onGenerateComplete: (callback: (result: any) => void) => void;
  onGenerateError: (callback: (result: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
