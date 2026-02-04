import { create } from "zustand";

export interface RemoteMCPServer {
  id: string;
  qualifiedName: string;
  namespace: string | null;
  displayName: string;
  description: string;
  iconUrl: string | null;
  verified: boolean;
  homepage: string;
}

interface ServersStore {
  // States
  isLoading: boolean;
  // Remote MCP States
  isSearchingRemoteMCP: boolean;
  remoteMCPSearchResults: RemoteMCPServer[];

  // Methods
  getRemoteMCPSearchResults: (term: string) => Promise<void>;
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useServersStore = create<ServersStore>((set, get) => ({
  isLoading: false,
  isSearchingRemoteMCP: false,
  remoteMCPSearchResults: [],

  getRemoteMCPSearchResults: async (term: string) => {
    set({ isSearchingRemoteMCP: true });
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      try {
        const results = await window.electronAPI.searchRemoteMCPServers(term);
        set({ remoteMCPSearchResults: results, isSearchingRemoteMCP: false });
      } catch (error) {
        console.error("Error fetching remote MCPs:", error);
        set({ isSearchingRemoteMCP: false });
      }
    }, 500);
  },
}));
