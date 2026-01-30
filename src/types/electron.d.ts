export interface ElectronAPI {
  // AI Composer
  aiCompose: (prompt: string) => void;
  onAIStep: (callback: (step: any) => void) => void;
  onAIComplete: (callback: (result: any) => void) => void;
  onAIError: (callback: (error: string) => void) => void;
  
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
