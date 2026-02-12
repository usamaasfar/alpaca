import type { MCPClient, OAuthClientInformation, OAuthTokens } from "@ai-sdk/mcp";
import type { server } from "~/renderer/stores/servers";

/**
 * Server data stored in electron-store
 * Includes OAuth tokens and client info that should never be sent over IPC
 */
export interface StoredServerData extends server {
  /** OAuth tokens for authenticated connections */
  tokens?: OAuthTokens;
  /** OAuth client registration information */
  clientInfo?: OAuthClientInformation;
  /** ISO timestamp of last update */
  updatedAt?: string;
}

/**
 * Sanitized server data safe to send over IPC to renderer
 * Excludes sensitive OAuth fields
 */
export interface PublicServerData extends server {
  /** Whether the server is currently connected */
  connected: boolean;
}

/**
 * Extended OAuth provider interface with Alpaca-specific methods
 */
export interface AlpacaOAuthClientProvider {
  /** OAuth redirect URL for this application */
  readonly redirectUrl: string;
  /** OAuth client metadata for registration */
  clientMetadata: {
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
    scope: string;
  };

  /** Get stored client information */
  clientInformation(): OAuthClientInformation | undefined;
  /** Save client registration information */
  saveClientInformation(info: OAuthClientInformation): Promise<void>;

  /** Get stored OAuth tokens */
  tokens(): OAuthTokens | undefined;
  /** Save OAuth tokens after successful authorization */
  saveTokens(tokens: OAuthTokens): Promise<void>;

  /** Open browser to OAuth authorization URL */
  redirectToAuthorization(url: URL): Promise<void>;

  /** Save PKCE code verifier for token exchange */
  saveCodeVerifier(verifier: string): Promise<void>;
  /** Get saved PKCE code verifier */
  codeVerifier(): Promise<string>;

  /** Clear all stored OAuth data */
  deleteTokens(): void;

  /** Reset auth state on error (clears in-progress flag and timeout) */
  resetAuthState(): void;
}

/**
 * Result from connection attempt or OAuth completion
 */
export interface ConnectionResult {
  /** Whether connection succeeded */
  success?: boolean;
  /** Whether OAuth re-authorization is required */
  reAuth: boolean;
  /** Error code if connection failed after OAuth */
  error?: "reconnection_failed" | "token_exchange_failed" | "invalid_code" | "no_auth_provider";
  /** Human-readable error message */
  message?: string;
}

/**
 * Status update during reconnection process
 */
export type ReconnectStatus =
  | { type: "start"; total: number }
  | { type: "connecting"; namespace: string }
  | { type: "connected"; namespace: string }
  | { type: "skipped"; namespace: string }
  | { type: "error"; namespace: string }
  | { type: "complete"; total: number; connected: number };

/**
 * Runtime state for MCP connections
 */
export interface MCPConnectionState {
  /** Active MCP client instances by namespace */
  clients: Map<string, MCPClient>;
  /** OAuth providers by namespace */
  authProviders: Map<string, AlpacaOAuthClientProvider>;
  /** Cached tools by namespace */
  toolsCache: Map<string, Record<string, any>>;
}
