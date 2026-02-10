import type { server, serverSearchResult } from "~/renderer/stores/servers";

export interface MCPConnectionResult {
  success: boolean;
  reAuth?: boolean;
  namespace?: string;
  tools?: string[];
}

export interface ElectronAPI {
  // Storage
  setStorage: (key: string, value: any) => Promise<boolean>;
  getStorage: (key: string) => Promise<any>;

  // Providers
  getOllamaHealth: () => Promise<boolean>;
  getOllamaModels: () => Promise<string[]>;

  // MCP Remote Servers
  searchRemoteMCPServers: (term: string) => Promise<serverSearchResult[]>;
  connectRemoteServer: (server: server) => Promise<MCPConnectionResult>;
  disconnectRemoteServer: (namespace: string) => Promise<{ success: boolean }>;
  listConnectedRemoteServers: () => Promise<Record<string, server & { connected: boolean }>>;
  completeMCPOAuth: (namespace: string, authCode: string) => Promise<MCPConnectionResult>;
  onMCPOAuthCallback: (callback: (data: { code: string; state: string }) => void) => () => void;
  onMCPReconnectStatus: (
    callback: (status: { type: string; namespace?: string; total?: number; connected?: number }) => void,
  ) => () => void;

  // AI Composer
  aiCompose: (prompt: string | null, mentions?: string[], messages?: any[]) => void;
  onAIStep: (callback: (step: any) => void) => void;
  onAIComplete: (callback: (result: any) => void) => void;
  onAIError: (callback: (error: any) => void) => void;

  // System
  openExternalLink: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
