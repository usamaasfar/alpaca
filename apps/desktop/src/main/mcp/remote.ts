import type { MCPClient } from "@ai-sdk/mcp";
import { createMCPClient, UnauthorizedError } from "@ai-sdk/mcp";
import type { server } from "~/renderer/stores/servers";
import { AlpacaOAuthProvider } from "./oauth-provider";
import { loadAllServers, loadServer, removeServer, sanitizeServerData, saveServer } from "./storage";
import type { ConnectionResult, MCPConnectionState, PublicServerData, ReconnectStatus } from "./types";

// --- Runtime state ---

const state: MCPConnectionState = {
  clients: new Map<string, MCPClient>(),
  authProviders: new Map<string, AlpacaOAuthProvider>(),
  toolsCache: new Map<string, Record<string, any>>(),
};

// --- Helper functions ---

function getServerUrl(namespace: string): string {
  return `https://server.smithery.ai/${namespace}`;
}

async function loadAndCacheTools(namespace: string): Promise<void> {
  const client = state.clients.get(namespace);
  if (!client) return;

  try {
    if (typeof client.tools === "function") {
      const tools = await client.tools();
      state.toolsCache.set(namespace, tools);
      console.log(`Cached ${Object.keys(tools).length} tools from ${namespace}`);
    }
  } catch (error) {
    console.error(`Failed to cache tools from ${namespace}:`, error);
  }
}

// --- Public API ---

export default {
  /**
   * Connect to a remote MCP server
   * Returns reAuth: true if OAuth flow is required
   */
  async connectServer(server: server): Promise<ConnectionResult> {
    try {
      console.log(`Connecting to ${server.namespace}`);

      let authProvider = state.authProviders.get(server.namespace);
      if (!authProvider) {
        const stored = loadServer(server.namespace);
        authProvider = new AlpacaOAuthProvider(server.namespace, stored?.tokens, stored?.clientInfo);
        state.authProviders.set(server.namespace, authProvider);
      }

      const client = await createMCPClient({
        transport: {
          type: "http",
          url: getServerUrl(server.namespace),
          authProvider,
        },
      });

      saveServer(server.namespace, server);
      state.clients.set(server.namespace, client);

      await loadAndCacheTools(server.namespace);

      return { reAuth: false };
    } catch (error: any) {
      // Use proper UnauthorizedError type from @ai-sdk/mcp
      if (error instanceof UnauthorizedError || error.message?.includes("Unauthorized") || error.code === "UNAUTHORIZED") {
        console.log(`OAuth flow initiated for ${server.namespace}, waiting for authorization...`);
        saveServer(server.namespace, server);
        return { reAuth: true };
      }

      console.error(`Failed to connect to ${server.namespace}:`, error);
      throw error;
    }
  },

  /**
   * Disconnect from a remote MCP server and clean up resources
   */
  async disconnectServer(namespace: string): Promise<void> {
    const client = state.clients.get(namespace);
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.error(`Error closing client for ${namespace}:`, error);
      }
    }
    state.clients.delete(namespace);
    state.toolsCache.delete(namespace);

    const authProvider = state.authProviders.get(namespace);
    if (authProvider) {
      authProvider.deleteTokens();
      state.authProviders.delete(namespace);
    }

    removeServer(namespace);
  },

  /**
   * List all connected servers with sanitized data (no OAuth fields)
   */
  listConnectedServers(): Record<string, PublicServerData> {
    const allServers = loadAllServers();
    const result: Record<string, PublicServerData> = {};

    for (const [namespace, data] of Object.entries(allServers)) {
      const connected = state.clients.has(namespace);
      result[namespace] = sanitizeServerData(data, connected);
    }

    return result;
  },

  /**
   * Complete OAuth flow after receiving authorization code
   * FIX: Better error handling and partial success support
   */
  async completeOAuth(namespace: string, authCode: string): Promise<ConnectionResult> {
    try {
      console.log(`Completing OAuth for ${namespace}`);

      const authProvider = state.authProviders.get(namespace);
      if (!authProvider) {
        const error = `No auth provider found for ${namespace}`;
        console.error(error);
        return {
          success: false,
          reAuth: false,
          error: "no_auth_provider",
          message: error,
        };
      }

      const serverUrl = getServerUrl(namespace);
      const tokenUrlObj = new URL(serverUrl);

      // Convert server URL to auth URL
      if (tokenUrlObj.hostname.includes("server.smithery.ai")) {
        tokenUrlObj.hostname = tokenUrlObj.hostname.replace("server.smithery.ai", "auth.smithery.ai");
      }

      tokenUrlObj.pathname = tokenUrlObj.pathname.replace(/\/$/, "") + "/token";
      const tokenUrl = tokenUrlObj.toString();

      // Get code verifier and client info
      let codeVerifier: string;
      try {
        codeVerifier = await authProvider.codeVerifier();
      } catch (error) {
        const message = `No code verifier found for ${namespace}. ${error}`;
        console.error(message);
        authProvider.resetAuthState();
        return {
          success: false,
          reAuth: false,
          error: "invalid_code",
          message,
        };
      }

      const clientInfoData = authProvider.clientInformation();

      // Prepare token request
      const tokenParams: Record<string, string> = {
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: authProvider.redirectUrl,
        code_verifier: codeVerifier,
      };

      if (clientInfoData?.client_id) {
        tokenParams.client_id = clientInfoData.client_id;
      }

      console.log(`Exchanging auth code for tokens at ${tokenUrl}`);

      // Exchange code for tokens
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(tokenParams).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Token exchange failed:`, errorText);
        authProvider.resetAuthState();
        return {
          success: false,
          reAuth: false,
          error: "token_exchange_failed",
          message: `Token exchange failed: ${response.status} ${response.statusText}`,
        };
      }

      const tokens = await response.json();
      console.log(`Tokens received, saving for ${namespace}`);

      // Save tokens (this also resets auth state)
      await authProvider.saveTokens(tokens);

      console.log(`OAuth completed for ${namespace}. Reconnecting...`);

      // Try to reconnect with new tokens
      const stored = loadServer(namespace);
      if (!stored) {
        const message = `Server data not found for ${namespace}`;
        console.error(message);
        return {
          success: true,
          reAuth: false,
          error: "reconnection_failed",
          message,
        };
      }

      // FIX: Wrap reconnection in try-catch to handle partial success
      try {
        // Pass only server metadata to avoid re-saving stale token snapshot
        const { tokens: _t, clientInfo: _c, updatedAt: _u, ...serverData } = stored;
        await this.connectServer(serverData as server);

        return { success: true, reAuth: false };
      } catch (reconnectError: any) {
        // OAuth succeeded (tokens saved), but reconnection failed
        // This is a partial success - user can retry manually
        console.error(`OAuth succeeded but reconnection failed for ${namespace}:`, reconnectError);
        return {
          success: true,
          reAuth: false,
          error: "reconnection_failed",
          message: `OAuth completed but connection failed: ${reconnectError.message}`,
        };
      }
    } catch (error: any) {
      console.error(`Failed to complete OAuth for ${namespace}:`, error);

      // Reset auth state on error
      const authProvider = state.authProviders.get(namespace);
      if (authProvider) {
        authProvider.resetAuthState();
      }

      throw error;
    }
  },

  /**
   * Reconnect to all saved servers on app startup
   */
  async reconnectAll(onStatus?: (status: ReconnectStatus) => void): Promise<void> {
    const allServers = loadAllServers();
    const namespaces = Object.keys(allServers);

    console.log(`Reconnecting to ${namespaces.length} saved servers`, namespaces);

    onStatus?.({ type: "start", total: namespaces.length });

    const connectionPromises = namespaces.map(async (namespace) => {
      try {
        onStatus?.({ type: "connecting", namespace });

        const serverData = allServers[namespace];
        let authProvider = state.authProviders.get(namespace);

        if (!authProvider) {
          authProvider = new AlpacaOAuthProvider(namespace, serverData.tokens, serverData.clientInfo);
          state.authProviders.set(namespace, authProvider);
        }

        if (!authProvider.tokens()) {
          onStatus?.({ type: "skipped", namespace });
          return { status: "skipped", namespace };
        }

        const client = await createMCPClient({
          transport: {
            type: "http",
            url: getServerUrl(namespace),
            authProvider,
          },
        });

        state.clients.set(namespace, client);
        console.log(`Reconnected to ${namespace}`);

        await loadAndCacheTools(namespace);

        onStatus?.({ type: "connected", namespace });
        return { status: "connected", namespace };
      } catch (error) {
        console.error(`Failed to reconnect to ${namespace}:`, error);
        onStatus?.({ type: "error", namespace });
        return { status: "error", namespace };
      }
    });

    await Promise.allSettled(connectionPromises);

    console.log(`Reconnection complete: ${state.clients.size}/${namespaces.length} servers connected`);

    onStatus?.({
      type: "complete",
      total: namespaces.length,
      connected: state.clients.size,
    });
  },

  /**
   * Get all cached tools from all connected servers
   */
  getAllTools(): Record<string, any> {
    const allTools: Record<string, any> = {};

    for (const [, tools] of state.toolsCache.entries()) {
      Object.assign(allTools, tools);
    }

    console.log(`Total cached MCP tools available: ${Object.keys(allTools).length} from ${state.toolsCache.size} servers`);
    return allTools;
  },

  /**
   * Get cached tools from specific servers
   */
  getToolsFromServers(namespaces: string[]): Record<string, any> {
    const tools: Record<string, any> = {};

    for (const namespace of namespaces) {
      const cachedTools = state.toolsCache.get(namespace);

      if (cachedTools) {
        Object.assign(tools, cachedTools);
        console.log(`Using cached tools from ${namespace}:`, Object.keys(cachedTools).length);
      } else {
        console.warn(`MCP server "${namespace}" not connected or tools not cached`);
      }
    }

    console.log(`Total cached tools from ${namespaces.length} servers: ${Object.keys(tools).length}`);
    return tools;
  },

  /**
   * Clean up all MCP connections and clear state
   * Should be called on app shutdown
   */
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${state.clients.size} MCP connections...`);

    const closePromises = Array.from(state.clients.entries()).map(async ([namespace, client]) => {
      try {
        await client.close();
        console.log(`Closed connection to ${namespace}`);
      } catch (error) {
        console.error(`Error closing connection to ${namespace}:`, error);
      }
    });

    await Promise.allSettled(closePromises);

    // Clear all state
    state.clients.clear();
    state.authProviders.clear();
    state.toolsCache.clear();

    console.log("MCP cleanup complete");
  },
};
