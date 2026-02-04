export interface ElectronAPI {
  // Storage
  setStorage: (key: string, value: any) => Promise<boolean>;
  getStorage: (key: string) => Promise<any>;
  setSecureStorage: (key: string, value: string) => Promise<boolean>;
  getSecureStorage: (key: string) => Promise<string>;

  // Providers
  getOllamaHealth: () => Promise<boolean>;
  getOllamaModels: () => Promise<string[]>;

  // Servers
  searchRemoteMCPServers: (term: string) => Promise<any>;

  // // AI Composition
  // aiCompose: (prompt: string, mentions?: string[]) => Promise<any>;
  // onAIStep: (callback: (step: any) => void) => void;
  // onAIComplete: (callback: (result: any) => void) => void;
  // onAIError: (callback: (error: any) => void) => void;

  // System
  openExternalLink: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
