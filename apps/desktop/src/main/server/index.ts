import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import storage from "~/main/utils/storage";

type LocalServer = {
  command: string;
  arguments: string[];
};

type RemoteServer = {
  url: string;
  authorization: string;
  headers: Record<string, string>;
};

type Server = {
  name: string;
  enabled: boolean;
} & ({ type: "local"; config: LocalServer } | { type: "remote"; config: RemoteServer });

export type ServerList = {
  name: string;
  type: "local" | "remote";
  enabled: boolean;
  status: "connected" | "connecting" | "disconnected" | "error";
};

class ServerManager {
  // Properties
  clients: Map<string, MCPClient>;
  tools: Map<string, Awaited<ReturnType<MCPClient["tools"]>>>;
  status: Map<string, "connected" | "connecting" | "disconnected" | "error">;

  // Constructor
  constructor() {
    this.clients = new Map();
    this.tools = new Map();
    this.status = new Map();
  }

  // Lifecycle methods
  async initialize(): Promise<void> {
    const servers = this._getServersFromStorage();

    for (const server of servers) {
      // Initialize status for all servers
      if (!server.enabled) {
        this.status.set(server.name, "disconnected");
        continue;
      }

      // Skip if already connected
      if (this.clients.has(server.name)) continue;

      try {
        await this._connectServer(server);
      } catch (error) {
        console.error(`Failed to connect server "${server.name}":`, error);
        // Continue with other servers even if one fails
      }
    }

    await this._refreshTools();
  }

  async destroy(): Promise<void> {
    for (const [_name, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (error) {
        console.error(`Failed to close client "${_name}":`, error);
      }
    }

    this.clients.clear();
    this.tools.clear();
    this.status.clear();
  }

  // IPC operations
  listServers(): ServerList[] {
    const servers = this._getServersFromStorage();
    return servers.map((server) => ({
      name: server.name,
      type: server.type,
      enabled: server.enabled,
      status: this.status.get(server.name) || "disconnected",
    }));
  }

  async addServer(server: Server): Promise<void> {
    // enable by default
    const serverWithDefaults = { enabled: true, ...server };
    this._saveServerToStorage(serverWithDefaults);

    await this._connectServer(serverWithDefaults);
    await this._refreshTools();
  }

  async removeServer(name: string): Promise<void> {
    this._removeServerFromStorage(name);
    await this._disconnectServer(name);
    await this._refreshTools();
    this.status.delete(name);
  }

  async updateServer(oldName: string, newServer: Server): Promise<void> {
    this._updateServerInStorage(oldName, newServer);

    if (this.clients.has(oldName)) {
      await this._disconnectServer(oldName);
      await this._connectServer(newServer);
      await this._refreshTools();
    }
  }

  async enableServer(name: string): Promise<void> {
    const servers = this._getServersFromStorage();
    const server = servers.find((s) => s.name === name);

    if (!server) {
      throw new Error(`Server with name "${name}" not found`);
    }

    // Update enabled status in storage
    server.enabled = true;
    this._updateServerInStorage(name, server);

    // Connect the server
    await this._connectServer(server);
    await this._refreshTools();
  }

  async disableServer(name: string): Promise<void> {
    const servers = this._getServersFromStorage();
    const server = servers.find((s) => s.name === name);

    if (!server) {
      throw new Error(`Server with name "${name}" not found`);
    }

    // Update enabled status in storage
    server.enabled = false;
    this._updateServerInStorage(name, server);

    // Disconnect the server
    await this._disconnectServer(name);
    await this._refreshTools();
  }

  async reconnectServer(name: string): Promise<void> {
    const servers = this._getServersFromStorage();
    const server = servers.find((s) => s.name === name);

    if (!server) {
      throw new Error(`Server with name "${name}" not found`);
    }

    // Disconnect if currently connected
    if (this.clients.has(name)) {
      await this._disconnectServer(name);
    }

    // Reconnect
    await this._connectServer(server);
    await this._refreshTools();
  }

  // Private methods - Tools management
  private async _refreshTools(): Promise<void> {
    this.tools.clear();

    for (const [name, client] of this.clients.entries()) {
      try {
        const tool = await client.tools();
        this.tools.set(name, tool);
      } catch (error) {
        console.error(`Failed to load tools for server "${name}":`, error);
        // Continue with other clients even if one fails
      }
    }
  }

  // Private methods - Connection management
  private async _connectServer(server: Server): Promise<void> {
    this.status.set(server.name, "connecting");

    try {
      let client: MCPClient;

      if (server.type === "local") {
        client = await createMCPClient({
          transport: new StdioClientTransport({ command: server.config.command, args: server.config.arguments }),
        });
      } else {
        client = await createMCPClient({
          transport: {
            type: "http",
            url: server.config.url,
            headers: { Authorization: server.config.authorization, ...server.config.headers },
          },
        });
      }

      this.clients.set(server.name, client);
      this.status.set(server.name, "connected");
    } catch (error) {
      this.status.set(server.name, "error");
      throw error;
    }
  }

  private async _disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) return;

    await client.close();
    this.clients.delete(name);
    this.tools.delete(name);
    this.status.set(name, "disconnected");
  }

  // Private methods - Storage operations
  private _getServersFromStorage(): Server[] {
    try {
      const data = storage.get("servers");
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to parse servers from storage:", error);
      return [];
    }
  }

  private _saveServersToStorage(servers: Server[]): void {
    try {
      storage.set("servers", JSON.stringify(servers));
    } catch (error) {
      console.error("Failed to save servers to storage:", error);
      throw error;
    }
  }

  private _saveServerToStorage(server: Server): void {
    const servers = this._getServersFromStorage();

    // Validation: Check for duplicate server name
    if (servers.some((s) => s.name === server.name)) {
      throw new Error(`Server with name "${server.name}" already exists`);
    }

    servers.push(server);
    this._saveServersToStorage(servers);
  }

  private _removeServerFromStorage(name: string): void {
    const servers = this._getServersFromStorage();
    const filteredServers = servers.filter((server) => server.name !== name);

    if (filteredServers.length === servers.length) {
      throw new Error(`Server with name "${name}" not found`);
    }

    this._saveServersToStorage(filteredServers);
  }

  private _updateServerInStorage(oldName: string, newServer: Server): void {
    const servers = this._getServersFromStorage();
    const serverIndex = servers.findIndex((server) => server.name === oldName);

    if (serverIndex === -1) {
      throw new Error(`Server with name "${oldName}" not found`);
    }

    servers[serverIndex] = newServer;
    this._saveServersToStorage(servers);
  }
}

export default new ServerManager();
