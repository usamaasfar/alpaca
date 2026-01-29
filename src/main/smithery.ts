import * as fs from "node:fs";
import * as path from "node:path";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { app, shell } from "electron";

class ElectronOAuthProvider {
  private _tokens?: any;
  private _clientInfo?: any;
  private _codeVerifier?: string;
  private tokenPath: string;

  constructor(private mcpName: string) {
    const userDataPath = app.getPath("userData");
    this.tokenPath = path.join(userDataPath, `mcp-tokens-${mcpName.toLowerCase()}.json`);
    this.loadTokens();
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const data = fs.readFileSync(this.tokenPath, "utf8");
        const saved = JSON.parse(data);
        this._tokens = saved.tokens;
        this._clientInfo = saved.clientInfo;
        console.log(`📁 Loaded saved tokens for ${this.mcpName}`);
      }
    } catch (error) {
      console.log(`No saved tokens for ${this.mcpName}`);
    }
  }

  private saveTokensToFile() {
    try {
      const data = {
        tokens: this._tokens,
        clientInfo: this._clientInfo,
      };
      fs.writeFileSync(this.tokenPath, JSON.stringify(data, null, 2));
      console.log(`💾 Saved tokens for ${this.mcpName}`);
    } catch (error) {
      console.error(`Failed to save tokens for ${this.mcpName}:`, error);
    }
  }

  get redirectUrl() {
    return "myapp://oauth/callback";
  }

  get clientMetadata() {
    return {
      client_name: "My Desktop App",
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
    this.saveTokensToFile();
  }

  tokens() {
    return this._tokens;
  }

  async saveTokens(tokens: any) {
    this._tokens = tokens;
    this.saveTokensToFile();
    console.log(`✅ Tokens saved for ${this.mcpName}`);
  }

  async redirectToAuthorization(url: URL) {
    console.log(`🔐 Opening OAuth URL for ${this.mcpName}:`, url.toString());
    shell.openExternal(url.toString());
  }

  async saveCodeVerifier(verifier: string) {
    this._codeVerifier = verifier;
  }

  async codeVerifier() {
    return this._codeVerifier!;
  }
}

interface ConnectedMCP {
  name: string;
  url: string;
  client: any;
  tools: any;
}

export class MCPManager {
  private connections = new Map<string, ConnectedMCP>();
  private oauthProviders = new Map<string, ElectronOAuthProvider>();

  async connectToMCP(name: string, serverUrl: string): Promise<{ success: boolean; needsAuth?: boolean; tools?: any }> {
    try {
      console.log(`🔗 Connecting to ${name}...`);

      // Reuse or create OAuth provider
      let authProvider = this.oauthProviders.get(name);
      if (!authProvider) {
        authProvider = new ElectronOAuthProvider(name);
        this.oauthProviders.set(name, authProvider);
      }

      const client = await createMCPClient({
        transport: {
          type: "http",
          url: serverUrl,
          authProvider,
        },
      });

      const tools = await client.tools();

      this.connections.set(name, {
        name,
        url: serverUrl,
        client,
        tools,
      });

      console.log(`✅ ${name} connected! Tools:`, Object.keys(tools));
      return { success: true, tools };
    } catch (error: any) {
      if (error.message?.includes("unauthorized") || error.message?.includes("auth")) {
        console.log(`🔐 ${name} needs OAuth authorization`);
        return { success: false, needsAuth: true };
      }

      console.error(`❌ ${name} connection failed:`, error);
      throw error;
    }
  }

  async finishOAuth(name: string, serverUrl: string, authCode: string): Promise<{ success: boolean; tools?: any }> {
    try {
      console.log(`🔗 Finishing OAuth for ${name}...`);

      // Use the same OAuth provider instance
      const authProvider = this.oauthProviders.get(name);
      if (!authProvider) {
        throw new Error(`No OAuth provider found for ${name}`);
      }

      const client = await createMCPClient({
        transport: {
          type: "http",
          url: serverUrl,
          authProvider,
        },
      });

      // Complete OAuth flow
      await (client as any).transport.finishAuth(authCode);

      const tools = await client.tools();

      this.connections.set(name, {
        name,
        url: serverUrl,
        client,
        tools,
      });

      console.log(`✅ ${name} OAuth completed! Tools:`, Object.keys(tools));
      return { success: true, tools };
    } catch (error) {
      console.error(`❌ ${name} OAuth failed:`, error);
      throw error;
    }
  }

  getConnectedMCPs(): string[] {
    return Array.from(this.connections.keys());
  }

  getMCPTools(mcpName: string): any {
    return this.connections.get(mcpName)?.tools || {};
  }

  async closeMCP(mcpName: string) {
    const connection = this.connections.get(mcpName);
    if (connection) {
      await connection.client.close();
      this.connections.delete(mcpName);
    }
  }
}
