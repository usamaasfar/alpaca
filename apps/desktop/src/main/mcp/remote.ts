import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { shell } from "electron";
import storage from "~/main/utils/storage";

import type { server } from "~/renderer/stores/servers";

/**
 * OAuth client provider for MCP servers
 * Handles authentication and token persistence using OS secure storage
 */
export class OAuthClientProvider {
  private _tokens?: any;
  private _clientInfo?: any;
  private _codeVerifier?: string;
  private _authInProgress = false;
  private storageKey: string;

  constructor(private serverName: string) {
    this.storageKey = `mcp-${serverName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-auth`;
    this.loadTokens();
  }

  private loadTokens() {
    try {
      const saved = storage.secureStore.get(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this._tokens = data.tokens;
        this._clientInfo = data.clientInfo;
        console.log(`Loaded saved tokens for ${this.serverName}`);
      }
    } catch (error) {
      console.log(`No saved tokens for ${this.serverName}`);
    }
  }

  private saveTokensToStorage() {
    try {
      const data = { tokens: this._tokens, clientInfo: this._clientInfo, updatedAt: new Date().toISOString() };
      storage.secureStore.set(this.storageKey, JSON.stringify(data));
      console.log(`Saved tokens for ${this.serverName}`);
    } catch (error) {
      console.error(`Failed to save tokens for ${this.serverName}:`, error);
    }
  }

  get redirectUrl(): string {
    return "integral.computer://oauth/callback";
  }

  get clientMetadata() {
    return {
      client_name: "Integral Computer Desktop",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "mcp:tools",
    };
  }

  clientInformation() {
    return this._clientInfo;
  }

  async saveClientInformation(info: any) {
    this._clientInfo = info;
    this.saveTokensToStorage();
  }

  tokens() {
    return this._tokens;
  }

  async saveTokens(tokens: any) {
    this._tokens = tokens;
    this._authInProgress = false;
    this.saveTokensToStorage();
    console.log(`OAuth complete for ${this.serverName}`);
  }

  async redirectToAuthorization(url: URL) {
    if (this._authInProgress) {
      console.log(`Skipping duplicate OAuth URL for ${this.serverName} (auth already in progress)`);
      return;
    }

    console.log(`Opening OAuth URL for ${this.serverName}`);
    this._authInProgress = true;
    await shell.openExternal(url.toString());
  }

  async saveCodeVerifier(verifier: string) {
    if (this._authInProgress && this._codeVerifier) {
      console.log(`Skipping code verifier update for ${this.serverName} (auth in progress, keeping original verifier)`);
      return;
    }
    this._codeVerifier = verifier;
  }

  async codeVerifier() {
    if (!this._codeVerifier) throw new Error("No code verifier saved");
    return this._codeVerifier;
  }

  deleteTokens() {
    this._tokens = undefined;
    this._clientInfo = undefined;
    this._codeVerifier = undefined;
    this._authInProgress = false;
    try {
      storage.secureStore.delete(this.storageKey);
    } catch (error) {
      console.error(`Failed to delete tokens for ${this.serverName}:`, error);
    }
  }
}

const connectionClients = new Map<any, any>();
const authProviders = new Map<string, OAuthClientProvider>();

function getServerUrl(namespace: string): string {
  return `https://server.smithery.ai/${namespace}`;
}

function saveConnectedServers(server: server) {
  const storedServers = storage.store.get("remote-connected-servers") as Record<string, server> | undefined;
  if (storedServers) {
    const servers = { ...storedServers, [server.namespace]: server };
    storage.store.set("remote-connected-servers", servers as any);
  } else {
    storage.store.set("remote-connected-servers", { [server.namespace]: server } as any);
  }
}

function removeConnectedServer(namespace: string) {
  const storedServers = storage.store.get("remote-connected-servers") as Record<string, server> | undefined;
  if (storedServers) {
    const servers = { ...storedServers };
    delete servers[namespace];
    storage.store.set("remote-connected-servers", servers as any);
  }
}

function loadConnectedServers(): Record<string, server> {
  return storage.store.get("remote-connected-servers", {}) as Record<string, server>;
}

export default {
  async connectServer(server: server) {
    try {
      console.log(server);
      console.log(`Connecting to ${server.namespace}`);
      let authProvider = authProviders.get(server.namespace);
      if (!authProvider) {
        authProvider = new OAuthClientProvider(server.namespace);
        authProviders.set(server.namespace, authProvider);
      }

      const client = await createMCPClient({ transport: { type: "http", url: getServerUrl(server.namespace), authProvider } });
      saveConnectedServers(server);
      connectionClients.set(server.namespace, client);

      return { reAuth: false };
    } catch (error: any) {
      // If unauthorized, OAuth flow has started - wait for callback
      if (error.message?.includes("Unauthorized") || error.code === "UNAUTHORIZED") {
        console.log(`OAuth flow initiated for ${server.namespace}, waiting for authorization...`);
        saveConnectedServers(server); // Save server even if not connected yet
        return { reAuth: true };
      }

      console.error(`Failed to connect to ${server.namespace}:`, error);
      throw error;
    }
  },

  async disconnectServer(namespace: string) {
    // Close the active connection
    const client = connectionClients.get(namespace);
    if (client) await client.close();
    connectionClients.delete(namespace);

    // Delete OAuth tokens
    const authProvider = authProviders.get(namespace);
    if (authProvider) {
      authProvider.deleteTokens();
      authProviders.delete(namespace);
    }

    // Remove from saved servers list
    removeConnectedServer(namespace);
  },

  /**
   * List all saved servers with their current connection status
   * Returns: { namespace: { ...serverData, connected: boolean } }
   */
  listConnectedServers(): Record<string, server & { connected: boolean }> {
    const savedServers = loadConnectedServers();
    const result: Record<string, server & { connected: boolean }> = {};

    for (const [namespace, serverData] of Object.entries(savedServers)) {
      result[namespace] = { ...serverData, connected: connectionClients.has(namespace) };
    }

    return result;
  },

  async completeOAuth(namespace: string, authCode: string) {
    try {
      console.log(`Completing OAuth for ${namespace}`);

      const authProvider = authProviders.get(namespace);
      if (!authProvider) {
        throw new Error(`No auth provider found for ${namespace}`);
      }

      const serverUrl = getServerUrl(namespace);
      const tokenUrlObj = new URL(serverUrl);

      if (tokenUrlObj.hostname.includes("server.smithery.ai")) {
        tokenUrlObj.hostname = tokenUrlObj.hostname.replace("server.smithery.ai", "auth.smithery.ai");
      }

      tokenUrlObj.pathname = tokenUrlObj.pathname.replace(/\/$/, "") + "/token";
      const tokenUrl = tokenUrlObj.toString();

      const codeVerifier = await authProvider.codeVerifier();
      const clientInfo = authProvider.clientInformation();

      const tokenParams: Record<string, string> = {
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: authProvider.redirectUrl,
        code_verifier: codeVerifier,
      };

      if (clientInfo?.client_id) {
        tokenParams.client_id = clientInfo.client_id;
      }

      console.log(`Exchanging auth code for tokens at ${tokenUrl}`);

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
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const tokens = await response.json();
      console.log(`Tokens received, saving for ${namespace}`);

      await authProvider.saveTokens(tokens);

      console.log(`OAuth completed for ${namespace}. Reconnecting...`);

      // Get the saved server data
      const savedServers = loadConnectedServers();
      const serverData = savedServers[namespace];

      if (!serverData) {
        throw new Error(`Server data not found for ${namespace}`);
      }

      await this.connectServer(serverData);

      return { success: true, reAuth: false };
    } catch (error: any) {
      console.error(`Failed to complete OAuth for ${namespace}:`, error);
      throw error;
    }
  },

  async reconnectAll() {
    const savedServers = loadConnectedServers();
    const namespaces = Object.keys(savedServers);

    console.log(`Reconnecting to ${namespaces.length} saved servers`, namespaces);

    for (const namespace of namespaces) {
      try {
        // Create or reuse auth provider
        let authProvider = authProviders.get(namespace);
        if (!authProvider) {
          authProvider = new OAuthClientProvider(namespace);
          authProviders.set(namespace, authProvider);
        }

        // Skip if no tokens (will need re-auth) - shows disconnected
        if (!authProvider.tokens()) continue;

        // Attempt reconnection
        const client = await createMCPClient({ transport: { type: "http", url: getServerUrl(namespace), authProvider } });

        connectionClients.set(namespace, client);
        console.log(`Reconnected to ${namespace}`);
      } catch (error) {
        console.error(`Failed to reconnect to ${namespace}:`, error);
      }
    }

    console.log(`Reconnection complete: ${connectionClients.size}/${namespaces.length} servers connected`);
  },
};
