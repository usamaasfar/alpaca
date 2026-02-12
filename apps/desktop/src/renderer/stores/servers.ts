import { create } from "zustand";
import { toast } from "sonner";

export interface serverSearchResult {
  id: string;
  qualifiedName: string;
  namespace: string;
  displayName: string;
  description: string;
  iconUrl: string;
  verified: boolean;
  homepage: string;
}

export interface server {
  namespace: string;
  displayName: string;
  iconUrl: string;
  verified: boolean;
  homepage: string;
}

interface ServersStore {
  // server search
  isSearchingServers: boolean;
  serverSearchResults: serverSearchResult[];
  searchServers: (term: string) => Promise<void>;

  // server connection
  isServerConnecting: boolean;
  isServerDisconnecting: boolean;
  isConnectedServersLoading: boolean;
  pendingOAuthNamespace: string | null;
  getConnectedServers: () => Promise<Record<string, server & { connected: boolean }>>;
  connectServer: (server: server) => Promise<void>;
  disconnectServer: (namespace: string) => Promise<void>;
  completeOAuthFlow: (code: string) => Promise<void>;
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useServersStore = create<ServersStore>((set) => ({
  isSearchingServers: false,
  isServerConnecting: false,
  isServerDisconnecting: false,
  isConnectedServersLoading: false,
  pendingOAuthNamespace: null,
  serverSearchResults: [],

  searchServers: async (term: string) => {
    set({ isSearchingServers: true });
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      try {
        const results = await window.electronAPI.searchRemoteMCPServers(term);
        set({ serverSearchResults: results, isSearchingServers: false });
      } catch (error) {
        console.error("Error fetching remote MCPs:", error);
        set({ isSearchingServers: false });
      }
    }, 500);
  },

  connectServer: async (server: server) => {
    set({ isServerConnecting: true });
    try {
      const result = await window.electronAPI.connectRemoteServer(server);

      if (result.reAuth) {
        console.log(`OAuth flow started for ${server.namespace}`);
        console.log(`Complete authorization in your browser`);
        // Track pending OAuth and keep connecting state true
        set({ pendingOAuthNamespace: server.namespace });
        return;
      }

      console.log(`Successfully connected to ${server.namespace}`);
      set({ isServerConnecting: false });
    } catch (error) {
      console.error("Error connecting to remote MCP:", error);
      set({ isServerConnecting: false });
      throw error;
    }
  },

  completeOAuthFlow: async (code: string) => {
    const { pendingOAuthNamespace } = useServersStore.getState();

    if (!pendingOAuthNamespace) {
      console.warn("OAuth callback received but no pending namespace");
      toast.warning("OAuth callback received but no pending authorization");
      return;
    }

    try {
      console.log(`Completing OAuth for ${pendingOAuthNamespace}...`);
      const result = await window.electronAPI.completeMCPOAuth(pendingOAuthNamespace, code);

      // Handle different result states
      if (result.success === false) {
        // Complete failure
        console.error(`OAuth failed for ${pendingOAuthNamespace}:`, result.message);
        toast.error(`OAuth failed: ${result.message || "Unknown error"}`, {
          description: "Click to retry connecting",
          action: {
            label: "Retry",
            onClick: () => {
              // User can manually retry by clicking connect again in UI
              set({ isServerConnecting: false, pendingOAuthNamespace: null });
            },
          },
        });
      } else if (result.error === "reconnection_failed") {
        // Partial success - tokens saved but connection failed
        console.warn(`OAuth succeeded but reconnection failed for ${pendingOAuthNamespace}`);
        toast.warning("OAuth completed but connection failed", {
          description: result.message || "Tokens were saved. Try connecting again.",
          action: {
            label: "Retry",
            onClick: () => {
              set({ isServerConnecting: false, pendingOAuthNamespace: null });
            },
          },
        });
      } else {
        // Complete success
        console.log(`OAuth completed for ${pendingOAuthNamespace}`);
        toast.success(`Connected to ${pendingOAuthNamespace}`, {
          description: "MCP server is now available",
        });
      }
    } catch (error) {
      console.error("OAuth completion error:", error);
      toast.error("OAuth completion failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
        action: {
          label: "Retry",
          onClick: () => {
            set({ isServerConnecting: false, pendingOAuthNamespace: null });
          },
        },
      });
    } finally {
      // Reset state
      set({ isServerConnecting: false, pendingOAuthNamespace: null });
    }
  },

  disconnectServer: async (namespace) => {
    set({ isServerDisconnecting: true });
    try {
      await window.electronAPI.disconnectRemoteServer(namespace);
      console.log("Disconnected from remote MCP:", namespace);
    } catch (error) {
      console.error("Error disconnecting from remote MCP:", error);
    } finally {
      set({ isServerDisconnecting: false });
    }
  },

  getConnectedServers: async () => {
    set({ isConnectedServersLoading: true });
    try {
      const servers = await window.electronAPI.listConnectedRemoteServers();
      return servers;
    } catch (error) {
      console.error("Error listing connected remote MCPs:", error);
      return {};
    } finally {
      set({ isConnectedServersLoading: false });
    }
  },
}));
