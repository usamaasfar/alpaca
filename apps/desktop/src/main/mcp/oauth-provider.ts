import type { OAuthClientInformation, OAuthTokens } from "@ai-sdk/mcp";
import { shell } from "electron";
import { saveServer } from "./storage";
import type { AlpacaOAuthClientProvider } from "./types";

/**
 * OAuth client provider for Alpaca Desktop MCP connections
 * Manages OAuth flow state and token storage
 */
export class AlpacaOAuthProvider implements AlpacaOAuthClientProvider {
  private _tokens?: OAuthTokens;
  private _clientInfo?: OAuthClientInformation;
  private _codeVerifier?: string;
  private _authInProgress = false;
  private _authTimeout?: NodeJS.Timeout;
  private _lastRedirectTime = 0;

  constructor(
    private readonly serverName: string,
    tokens?: OAuthTokens,
    clientInfo?: OAuthClientInformation,
  ) {
    this._tokens = tokens;
    this._clientInfo = clientInfo;
  }

  get redirectUrl(): string {
    return "alpaca.computer://oauth/callback";
  }

  get clientMetadata() {
    return {
      client_name: "Alpaca Computer",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "mcp:tools",
    };
  }

  clientInformation(): OAuthClientInformation | undefined {
    return this._clientInfo;
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    this._clientInfo = info;
    saveServer(this.serverName, {
      clientInfo: this._clientInfo,
      updatedAt: new Date().toISOString(),
    });
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this._tokens = tokens;
    this._authInProgress = false;
    this._lastRedirectTime = 0;
    this._clearAuthTimeout();

    saveServer(this.serverName, {
      tokens: this._tokens,
      clientInfo: this._clientInfo,
      updatedAt: new Date().toISOString(),
    });

    console.log(`OAuth complete for ${this.serverName}`);
  }

  async redirectToAuthorization(url: URL): Promise<void> {
    const now = Date.now();
    const timeSinceLastRedirect = now - this._lastRedirectTime;

    // FIX: Prevent duplicate OAuth flows within 3 seconds (AI SDK makes 2 requests)
    // but allow retries after that (user may have closed browser)
    if (timeSinceLastRedirect < 3000) {
      console.log(
        `[OAUTH-DEBOUNCE] Blocked duplicate redirect for ${this.serverName} ` + `(${timeSinceLastRedirect}ms since last redirect)`,
      );
      return;
    }

    // Allow retries after 3 seconds if auth is in progress
    if (this._authInProgress) {
      console.log(`OAuth already in progress for ${this.serverName}, but allowing retry (user may have closed browser)`);
    }

    console.log(`Opening OAuth URL for ${this.serverName}`);
    this._authInProgress = true;
    this._lastRedirectTime = now;

    // Set timeout to reset auth state if tokens are never saved (5 minutes)
    this._setAuthTimeout();

    await shell.openExternal(url.toString());
  }

  async saveCodeVerifier(verifier: string): Promise<void> {
    const now = Date.now();
    const timeSinceLastRedirect = now - this._lastRedirectTime;

    // FIX: Prevent duplicate code verifier saves within 3 seconds (same timing as redirect debounce)
    // but allow updates after that (for retries)
    if (this._codeVerifier && timeSinceLastRedirect < 3000) {
      console.log(
        `[OAUTH-DEBOUNCE] Blocked duplicate code verifier save for ${this.serverName} ` +
          `(${timeSinceLastRedirect}ms since last redirect)`,
      );
      return;
    }

    // Allow verifier updates after 3 seconds if auth is in progress
    if (this._authInProgress && this._codeVerifier) {
      console.log(`Updating code verifier for ${this.serverName} (replacing previous verifier for retry)`);
    }

    this._codeVerifier = verifier;
  }

  async codeVerifier(): Promise<string> {
    if (!this._codeVerifier) {
      throw new Error(`No code verifier saved for ${this.serverName}`);
    }
    return this._codeVerifier;
  }

  deleteTokens(): void {
    this._tokens = undefined;
    this._clientInfo = undefined;
    this._codeVerifier = undefined;
    this._authInProgress = false;
    this._lastRedirectTime = 0;
    this._clearAuthTimeout();
  }

  /**
   * Reset auth state on error
   * Should be called when OAuth flow fails
   */
  resetAuthState(): void {
    this._authInProgress = false;
    this._lastRedirectTime = 0;
    this._clearAuthTimeout();
    console.log(`Auth state reset for ${this.serverName}`);
  }

  /**
   * Set a timeout to reset auth state if OAuth never completes
   * Prevents infinite loading state
   */
  private _setAuthTimeout(): void {
    this._clearAuthTimeout();

    this._authTimeout = setTimeout(
      () => {
        if (this._authInProgress) {
          console.warn(`OAuth timeout for ${this.serverName} - resetting auth state after 5 minutes`);
          this.resetAuthState();
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  /**
   * Clear the auth timeout
   */
  private _clearAuthTimeout(): void {
    if (this._authTimeout) {
      clearTimeout(this._authTimeout);
      this._authTimeout = undefined;
    }
  }
}
