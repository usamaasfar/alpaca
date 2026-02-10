import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { shell } from "electron";
import storage from "~/main/utils/storage";

import type { server } from "~/renderer/stores/servers";

// --- Storage helpers (servers::remote::{namespace}) ---

const SERVERS_INDEX_KEY = "servers::remote";

function serverKey(namespace: string): string {
  return `servers::remote::${namespace}`;
}

function loadServerIndex(): string[] {
  return (storage.get(SERVERS_INDEX_KEY, []) as string[]);
}

function loadServer(namespace: string): any | undefined {
  return storage.get(serverKey(namespace)) as any | undefined;
}

function loadAllServers(): Record<string, any> {
  const index = loadServerIndex();
  const result: Record<string, any> = {};
  for (const namespace of index) {
    const data = loadServer(namespace);
    if (data) result[namespace] = data;
  }
  return result;
}

function saveServer(namespace: string, data: Record<string, any>) {
  const existing = loadServer(namespace) || {};
  storage.set(serverKey(namespace), { ...existing, ...data } as any);

  const index = loadServerIndex();
  if (!index.includes(namespace)) {
    storage.set(SERVERS_INDEX_KEY, [...index, namespace]);
  }
}

function removeServer(namespace: string) {
  storage.delete(serverKey(namespace));
  const index = loadServerIndex();
  storage.set(SERVERS_INDEX_KEY, index.filter((n) => n !== namespace));
}

// --- OAuth client provider ---

export class OAuthClientProvider {
  private _tokens?: any;
  private _clientInfo?: any;
  private _codeVerifier?: string;
  private _authInProgress = false;

  constructor(
    private serverName: string,
    tokens?: any,
    clientInfo?: any,
  ) {
    this._tokens = tokens;
    this._clientInfo = clientInfo;
  }

  get redirectUrl(): string {
    return "alpaca.computer://oauth/callback";
  }

  get clientMetadata() {
    return {
      client_name: "Alpaca Computer Desktop",
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
    saveServer(this.serverName, { clientInfo: this._clientInfo, updatedAt: new Date().toISOString() });
  }

  tokens() {
    return this._tokens;
  }

  async saveTokens(tokens: any) {
    this._tokens = tokens;
    this._authInProgress = false;
    saveServer(this.serverName, { tokens: this._tokens, clientInfo: this._clientInfo, updatedAt: new Date().toISOString() });
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
  }
}

// --- Runtime state ---

const connectionClients = new Map<any, any>();
const authProviders = new Map<string, OAuthClientProvider>();
const toolsCache = new Map<string, Record<string, any>>();

function getServerUrl(namespace: string): string {
  return `https://server.smithery.ai/${namespace}`;
}

async function loadAndCacheTools(namespace: string): Promise<void> {
  const client = connectionClients.get(namespace);
  if (!client) return;

  try {
    if (typeof client.tools === "function") {
      const tools = await client.tools();
      toolsCache.set(namespace, tools);
      console.log(`Cached ${Object.keys(tools).length} tools from ${namespace}`);
    }
  } catch (error) {
    console.error(`Failed to cache tools from ${namespace}:`, error);
  }
}

// --- Public API ---

export default {
  async connectServer(server: server) {
    try {
      console.log(`Connecting to ${server.namespace}`);
      let authProvider = authProviders.get(server.namespace);
      if (!authProvider) {
        authProvider = new OAuthClientProvider(server.namespace);
        authProviders.set(server.namespace, authProvider);
      }

      const client = await createMCPClient({ transport: { type: "http", url: getServerUrl(server.namespace), authProvider } });
      saveServer(server.namespace, server);
      connectionClients.set(server.namespace, client);

      await loadAndCacheTools(server.namespace);

      return { reAuth: false };
    } catch (error: any) {
      if (error.message?.includes("Unauthorized") || error.code === "UNAUTHORIZED") {
        console.log(`OAuth flow initiated for ${server.namespace}, waiting for authorization...`);
        saveServer(server.namespace, server);
        return { reAuth: true };
      }

      console.error(`Failed to connect to ${server.namespace}:`, error);
      throw error;
    }
  },

  async disconnectServer(namespace: string) {
    const client = connectionClients.get(namespace);
    if (client) await client.close();
    connectionClients.delete(namespace);

    toolsCache.delete(namespace);

    const authProvider = authProviders.get(namespace);
    if (authProvider) {
      authProvider.deleteTokens();
      authProviders.delete(namespace);
    }

    removeServer(namespace);
  },

  listConnectedServers(): Record<string, server & { connected: boolean }> {
    const allServers = loadAllServers();
    const result: Record<string, server & { connected: boolean }> = {};

    for (const [namespace, data] of Object.entries(allServers)) {
      // Strip auth fields before sending over IPC
      const { tokens, clientInfo, updatedAt, ...serverData } = data;
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
      const clientInfoData = authProvider.clientInformation();

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

      const stored = loadServer(namespace);
      if (!stored) {
        throw new Error(`Server data not found for ${namespace}`);
      }

      // Pass only server metadata to avoid re-saving stale token snapshot
      const { tokens: _t, clientInfo: _c, updatedAt: _u, ...serverData } = stored;
      await this.connectServer(serverData as server);

      return { success: true, reAuth: false };
    } catch (error: any) {
      console.error(`Failed to complete OAuth for ${namespace}:`, error);
      throw error;
    }
  },

  async reconnectAll(onStatus?: (status: { type: string; namespace?: string; total?: number; connected?: number }) => void) {
    const allServers = loadAllServers();
    const namespaces = Object.keys(allServers);

    console.log(`Reconnecting to ${namespaces.length} saved servers`, namespaces);

    onStatus?.({ type: "start", total: namespaces.length });

    const connectionPromises = namespaces.map(async (namespace) => {
      try {
        onStatus?.({ type: "connecting", namespace });

        const serverData = allServers[namespace];
        let authProvider = authProviders.get(namespace);
        if (!authProvider) {
          authProvider = new OAuthClientProvider(namespace, serverData.tokens, serverData.clientInfo);
          authProviders.set(namespace, authProvider);
        }

        if (!authProvider.tokens()) {
          onStatus?.({ type: "skipped", namespace });
          return { status: "skipped", namespace };
        }

        const client = await createMCPClient({ transport: { type: "http", url: getServerUrl(namespace), authProvider } });

        connectionClients.set(namespace, client);
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

    console.log(`Reconnection complete: ${connectionClients.size}/${namespaces.length} servers connected`);

    onStatus?.({ type: "complete", total: namespaces.length, connected: connectionClients.size });
  },

  getAllTools() {
    const allTools: Record<string, any> = {};

    for (const [, tools] of toolsCache.entries()) {
      Object.assign(allTools, tools);
    }

    console.log(`Total cached MCP tools available: ${Object.keys(allTools).length} from ${toolsCache.size} servers`);
    return allTools;
  },

  getToolsFromServers(namespaces: string[]) {
    const tools: Record<string, any> = {};

    for (const namespace of namespaces) {
      const cachedTools = toolsCache.get(namespace);

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
};
