# MCP Remote Server Integration

This module provides OAuth-based integration with remote MCP (Model Context Protocol) servers via Smithery. It enables Alpaca to connect to external tools and services through a secure, standardized protocol.

## Table of Contents

- [Architecture](#architecture)
- [Module Structure](#module-structure)
- [Connection Flow](#connection-flow)
- [Visual Flow Diagram](#visual-flow-diagram)
- [Storage Schema](#storage-schema)
- [API Reference](#api-reference)
- [Key Features](#key-features)
- [Technical Implementation](#technical-implementation)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Architecture

The implementation follows a modular, type-safe architecture with clear separation of concerns:

```
apps/desktop/src/main/mcp/
├── types.ts            # TypeScript interfaces and type definitions
├── oauth-provider.ts   # OAuth client provider with debouncing and retry logic
├── storage.ts          # Encrypted storage helpers for server data and tokens
├── remote.ts           # Main API for managing MCP server connections
└── README.md           # This documentation
```

**Design Principles:**
- Type-safe interfaces for all data structures
- Encrypted local storage for OAuth tokens (no cloud dependencies)
- Graceful error handling with user feedback
- Resource cleanup to prevent memory leaks
- Modular code organization for maintainability

---

## Module Structure

### types.ts

Defines comprehensive TypeScript interfaces:

- `StoredServerData` - Complete server data including OAuth tokens (encrypted storage)
- `PublicServerData` - Sanitized server data for IPC (excludes OAuth fields)
- `AlpacaOAuthClientProvider` - OAuth provider interface with debouncing
- `ConnectionResult` - Return type for connection/OAuth operations
- `ReconnectStatus` - Union type for reconnection progress events
- `MCPConnectionState` - Runtime state management (clients, auth providers, tools cache)

### oauth-provider.ts

`AlpacaOAuthProvider` class implements OAuth 2.0 with PKCE flow:

**Features:**
- OAuth authorization and token management
- Time-based debouncing (prevents duplicate browser windows)
- 5-minute timeout protection (prevents infinite loading states)
- Retry support (allows user to retry after closing browser)
- State cleanup on success/error

**Key Methods:**
- `redirectToAuthorization()` - Opens browser with OAuth URL (debounced)
- `saveTokens()` - Saves tokens to encrypted storage
- `saveCodeVerifier()` - Stores PKCE code verifier (debounced)
- `codeVerifier()` - Retrieves stored code verifier
- `resetAuthState()` - Cleans up auth state on error

### storage.ts

Encrypted storage helpers using Electron Store:

**Functions:**
- `loadServerIndex()` - Returns list of all server namespaces
- `loadServer(namespace)` - Loads specific server data
- `loadAllServers()` - Loads all servers as a map
- `saveServer(namespace, data)` - Saves/updates server data
- `removeServer(namespace)` - Deletes server and removes from index
- `sanitizeServerData(data, connected)` - Strips OAuth fields for IPC

### remote.ts

Main API module for MCP server management:

**Public API:**
- `connectServer(server)` - Connect to MCP server (initiates OAuth if needed)
- `disconnectServer(namespace)` - Disconnect and clean up resources
- `listConnectedServers()` - Get all servers with connection status
- `completeOAuth(namespace, authCode)` - Complete OAuth flow with auth code
- `reconnectAll(onStatus?)` - Reconnect all saved servers on app startup
- `getAllTools()` - Get all cached tools from all servers
- `getToolsFromServers(namespaces)` - Get tools from specific servers
- `cleanup()` - Close all connections (called on app shutdown)

**Internal State:**
- `clients` - Map of active MCP client connections
- `authProviders` - Map of OAuth providers by namespace
- `toolsCache` - Map of cached tools for instant access

---

## Connection Flow

### 1. User Clicks "Install" on MCP Server

```typescript
const result = await remote.connectServer({
  namespace: "gmail",
  displayName: "Gmail",
  iconUrl: "...",
  verified: true,
  homepage: "...",
});
```

**What happens:**

1. Creates `AlpacaOAuthProvider` for the namespace
2. Loads saved tokens from encrypted storage (`servers::remote::{namespace}`)
3. Creates MCP client using stable `createMCPClient` API from `@ai-sdk/mcp`
4. Attempts to connect to server at `https://server.smithery.ai/{namespace}`

**Two possible paths:**

#### Path A: Has Valid Tokens

```
✓ Tokens exist in storage
✓ Server accepts tokens
✓ Client connection established
✓ Returns { reAuth: false, success: true }
✓ Tools are cached for instant access
```

#### Path B: Needs OAuth

```
✗ No tokens (or expired/invalid)
✗ Server returns UnauthorizedError
✓ OAuth flow automatically starts
✓ Browser opens to authorization URL
✓ Returns { reAuth: true }
✓ UI shows loading state
```

---

### 2. OAuth Flow (Path B)

When `reAuth: true` is returned:

**Step-by-step process:**

```
1. AI SDK calls: authProvider.redirectToAuthorization(authUrl)
   ├─> Debouncing check: Block if < 3 seconds since last redirect
   ├─> Opens browser to: https://auth.smithery.ai/{namespace}/authorize?...
   ├─> Sets 5-minute timeout to prevent infinite loading
   └─> Allows retries if user closes browser

2. User logs in and authorizes in browser
   └─> OAuth provider (Smithery) handles authentication

3. Browser redirects to: alpaca.computer://oauth/callback?code=ABC123&state=...
   └─> Deep link registered by Electron

4. Main process catches deep link
   └─> main.ts: app.on("open-url", ...) handler

5. IPC event sent to renderer
   └─> Event: "mcp-oauth-callback"

6. Renderer calls: completeMCPOAuth(namespace, code)
   ├─> Validates auth provider exists
   ├─> Retrieves PKCE code verifier
   ├─> Exchanges authorization code for tokens
   ├─> Saves tokens to encrypted storage
   └─> Attempts reconnection with new tokens

7. UI handles result:
   ├─> Success: Shows success toast, clears loading
   ├─> Partial success: Shows warning toast with retry option
   └─> Failure: Shows error toast with retry option
```

**OAuth improvements:**
- Retry support: Users can close browser and retry (no blocking guards)
- Timeout protection: 5-minute timeout prevents infinite loading
- Debouncing: 3-second window prevents duplicate browser windows
- Detailed errors: Specific error codes and human-readable messages
- Partial success: Tokens saved but reconnection failed (user can retry)

---

### 3. On App Startup

```typescript
// main.ts
await remote.reconnectAll((status) => {
  mainWindow?.webContents.send("mcp-reconnect-status", status);
});
```

**What happens:**

1. Loads all servers from storage (`servers::remote::*`)
2. For each server in parallel:
   - Creates `AlpacaOAuthProvider` with saved tokens
   - If tokens exist → attempts to create MCP client
   - If successful → caches tools for instant access
   - If no tokens → skips (user needs to re-auth)
3. Reports progress via status callback
4. Returns when all servers are processed

**Status callbacks:**
- `{ type: "start", total: number }` - Reconnection started
- `{ type: "connecting", namespace: string }` - Connecting to server
- `{ type: "connected", namespace: string }` - Successfully connected
- `{ type: "skipped", namespace: string }` - No tokens, skipped
- `{ type: "error", namespace: string }` - Connection failed
- `{ type: "complete", total: number, connected: number }` - All done

---

### 4. Disconnect Flow

```typescript
await remote.disconnectServer("gmail");
```

**What happens:**

1. Closes MCP client connection gracefully
2. Removes from active connections map
3. Clears cached tools for this server
4. Deletes OAuth tokens and client info
5. Removes server from encrypted storage
6. Updates server index

---

### 5. App Shutdown

```typescript
// main.ts: app.on("before-quit")
await remote.cleanup();
```

**What happens:**

1. Iterates through all active MCP client connections
2. Closes each client gracefully (with error handling)
3. Clears all runtime state:
   - `clients` Map
   - `authProviders` Map
   - `toolsCache` Map
4. Prevents memory leaks and hanging connections

---

## Visual Flow Diagram

```
User Clicks Install
       │
       ▼
connectServer(server)
       │
       ├─> AlpacaOAuthProvider created
       │   └─> Loads tokens from storage (servers::remote::{namespace})
       │
       ├─> Creates MCP client (stable createMCPClient API)
       │
       ▼
  Try to connect
       │
       ├──────────────┬──────────────┐
       │              │              │
   Has Valid      No Tokens      Expired
    Tokens            │              │
       │              ▼              ▼
       │         UnauthorizedError thrown
       │              │
       │              ├─> Caught by connectServer
       │              ├─> Debouncing check (3-second window)
       │              ├─> Browser opens for OAuth
       │              ├─> 5-minute timeout set
       │              ├─> Returns { reAuth: true }
       │              └─> UI shows loading spinner
       │                          │
       ▼                          ▼
   SUCCESS              User authorizes in browser
       │                          │
       │                          ▼
       │              alpaca.computer://oauth/callback?code=...
       │                          │
       │                          ▼
       │              Deep link → main process
       │                          │
       │                          ▼
       │              IPC event: mcp-oauth-callback
       │                          │
       │                          ▼
       │              completeMCPOAuth(namespace, code)
       │                          │
       │              ├─> Validate auth provider exists
       │              ├─> Exchange code for tokens
       │              ├─> saveTokens() → encrypted storage
       │              └─> Try reconnection
       │                          │
       │                   ┌──────┴──────┐
       │                   ▼             ▼
       │              Success      Reconnect Failed
       │                   │             │
       │                   │        (Partial success:
       │                   │         tokens saved,
       │                   │         show retry option)
       │                   │             │
       └───────────────────┴─────────────┘
                     │
                     ▼
              Connection established!
                     │
                     ▼
              Tools cached for instant use
```

---

## Storage Schema

### Encrypted Storage (Electron Store)

**Location:** Platform-specific encrypted storage (managed by electron-store)

**Index Key:** `servers::remote`
**Value:** `["gmail", "brave-search", "notion", ...]`

**Server Key:** `servers::remote::{namespace}`
**Value:**
```typescript
{
  // Server metadata
  namespace: "gmail",
  displayName: "Gmail",
  iconUrl: "https://...",
  verified: true,
  homepage: "https://...",

  // OAuth data (encrypted, never sent over IPC)
  tokens: {
    access_token: "...",
    refresh_token: "...",
    token_type: "Bearer",
    expires_in: 3600
  },
  clientInfo: {
    client_id: "...",
    client_secret: "..."
  },

  // Metadata
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

**Security Model:**

- OAuth tokens and client info are stored encrypted on disk
- Tokens never sent over IPC to renderer process
- `sanitizeServerData()` strips sensitive fields before IPC transmission
- Only `PublicServerData` (namespace, displayName, iconUrl, verified, homepage, connected) is exposed to renderer

---

## API Reference

### remote.connectServer(server)

Connects to a remote MCP server. Initiates OAuth if needed.

**Parameters:**
```typescript
server: {
  namespace: string;      // Unique server identifier
  displayName: string;    // Human-readable name
  iconUrl?: string;       // Server icon URL
  verified?: boolean;     // Verification status
  homepage?: string;      // Server homepage URL
}
```

**Returns:** `Promise<ConnectionResult>`
```typescript
{
  reAuth: boolean;        // true if OAuth is required
  success?: boolean;      // true if connection succeeded
  error?: string;         // error code if failed
  message?: string;       // human-readable error message
}
```

**Usage:**
```typescript
const result = await remote.connectServer({
  namespace: "gmail",
  displayName: "Gmail",
  iconUrl: "https://...",
  verified: true,
  homepage: "https://..."
});

if (result.reAuth) {
  // OAuth flow started, UI should show loading
} else if (result.success) {
  // Connected successfully
}
```

---

### remote.disconnectServer(namespace)

Disconnects from a server and removes all data.

**Parameters:**
- `namespace: string` - Server namespace to disconnect

**Returns:** `Promise<void>`

**Usage:**
```typescript
await remote.disconnectServer("gmail");
```

**Side effects:**
- Closes MCP client connection
- Clears cached tools
- Deletes OAuth tokens
- Removes from storage

---

### remote.listConnectedServers()

Gets all saved servers with connection status (sanitized for IPC).

**Returns:** `Record<string, PublicServerData>`

```typescript
{
  "gmail": {
    namespace: "gmail",
    displayName: "Gmail",
    iconUrl: "...",
    verified: true,
    homepage: "...",
    connected: true  // Whether MCP client is active
  },
  // ... more servers
}
```

**Usage:**
```typescript
const servers = remote.listConnectedServers();
console.log(`Total servers: ${Object.keys(servers).length}`);
console.log(`Connected: ${Object.values(servers).filter(s => s.connected).length}`);
```

---

### remote.completeOAuth(namespace, authCode)

Completes OAuth flow after receiving authorization code from deep link.

**Parameters:**
- `namespace: string` - Server namespace
- `authCode: string` - OAuth authorization code from callback URL

**Returns:** `Promise<ConnectionResult>`

**Error Codes:**
- `no_auth_provider` - No auth provider found for namespace
- `invalid_code` - Missing or invalid code verifier
- `token_exchange_failed` - Failed to exchange code for tokens
- `reconnection_failed` - Tokens saved but reconnection failed (partial success)

**Usage:**
```typescript
const result = await remote.completeOAuth("gmail", authCode);

if (result.success) {
  // OAuth completed successfully
} else if (result.error === "reconnection_failed") {
  // Tokens saved but connection failed - user can retry
} else {
  // OAuth failed completely
}
```

---

### remote.reconnectAll(onStatus?)

Reconnects to all saved servers on app startup.

**Parameters:**
- `onStatus?: (status: ReconnectStatus) => void` - Optional progress callback

**Returns:** `Promise<void>`

**Status Types:**
```typescript
type ReconnectStatus =
  | { type: "start"; total: number }
  | { type: "connecting"; namespace: string }
  | { type: "connected"; namespace: string }
  | { type: "skipped"; namespace: string }
  | { type: "error"; namespace: string }
  | { type: "complete"; total: number; connected: number };
```

**Usage:**
```typescript
await remote.reconnectAll((status) => {
  switch (status.type) {
    case "start":
      console.log(`Reconnecting to ${status.total} servers`);
      break;
    case "connected":
      console.log(`Connected to ${status.namespace}`);
      break;
    case "complete":
      console.log(`Done: ${status.connected}/${status.total}`);
      break;
  }
});
```

---

### remote.getAllTools()

Gets all cached tools from all connected servers.

**Returns:** `Record<string, any>`

**Usage:**
```typescript
const tools = remote.getAllTools();
console.log(`Total MCP tools: ${Object.keys(tools).length}`);
```

---

### remote.getToolsFromServers(namespaces)

Gets cached tools from specific servers.

**Parameters:**
- `namespaces: string[]` - Server namespaces to get tools from

**Returns:** `Record<string, any>`

**Usage:**
```typescript
const tools = remote.getToolsFromServers(["gmail", "notion"]);
console.log(`Tools from Gmail and Notion: ${Object.keys(tools).length}`);
```

---

### remote.cleanup()

Closes all MCP connections and clears state. Called on app shutdown.

**Returns:** `Promise<void>`

**Usage:**
```typescript
// main.ts
app.on("before-quit", async (event) => {
  event.preventDefault();
  await remote.cleanup();
  app.exit();
});
```

---

## Key Features

### Type Safety

- Comprehensive TypeScript interfaces for all data structures
- No `any` types in public APIs (except for tool definitions from MCP SDK)
- Full IDE intellisense support for better developer experience
- Compile-time error detection prevents runtime bugs

### OAuth Retry Support

- Removed blocking `_authInProgress` guards that prevented retries
- Users can close browser and retry OAuth without restarting app
- 5-minute timeout prevents infinite loading state if callback never arrives
- Clear auth state reset on errors to allow fresh attempts

### OAuth Debouncing (Critical Bug Fix)

**Problem:** Duplicate OAuth browser windows opening for a single connection attempt.

**Root Cause:** The AI SDK's SSE transport makes TWO separate HTTP requests during initial MCP connection:
1. `establishConnection()` → receives 401 → calls `auth()` → opens browser window #1
2. `send()` (initialization message) → receives 401 → calls `auth()` → opens browser window #2

Both requests happen within milliseconds of each other, causing duplicate OAuth flows.

**Solution:** Time-based debouncing in `oauth-provider.ts`

**Implementation:**
- Track `_lastRedirectTime` timestamp
- Block `redirectToAuthorization()` calls within 3 seconds of previous call
- Block `saveCodeVerifier()` calls within 3 seconds of previous call
- Allow retries after 3 seconds (user may have closed browser)
- Reset timestamp on success, error, or cleanup

**Code:**
```typescript
async redirectToAuthorization(url: URL): Promise<void> {
  const now = Date.now();
  const timeSinceLastRedirect = now - this._lastRedirectTime;

  // Block duplicates within 3 seconds
  if (timeSinceLastRedirect < 3000) {
    console.log(`[OAUTH-DEBOUNCE] Blocked duplicate redirect (${timeSinceLastRedirect}ms)`);
    return;
  }

  // Allow retries after 3 seconds
  this._authInProgress = true;
  this._lastRedirectTime = now;
  await shell.openExternal(url.toString());
}
```

### Error Handling

- Detailed error codes for different failure scenarios
- Human-readable error messages for user feedback
- Partial success handling (tokens saved but connection failed)
- User-friendly toast notifications with retry actions
- Proper error logging for debugging

### Resource Management

- Proper cleanup on app shutdown via `cleanup()` method
- No memory leaks (all MCP clients closed gracefully)
- Tools cached for instant access (no re-fetch on mention)
- Promise-based async operations with error handling

### Security

- OAuth tokens stored encrypted on disk (electron-store)
- Tokens never sent over IPC to renderer process
- Sanitized data for IPC transmission (only public fields)
- PKCE flow for OAuth authorization (prevents code interception)
- Deep link validation for OAuth callbacks

---

## Technical Implementation

### OAuth 2.0 with PKCE Flow

**PKCE (Proof Key for Code Exchange)** is used for enhanced security:

1. Generate random `code_verifier` (43-128 characters)
2. Create `code_challenge` = SHA256(code_verifier)
3. Start OAuth with `code_challenge`
4. Exchange authorization code + `code_verifier` for tokens
5. Server validates that `code_verifier` matches original `code_challenge`

This prevents authorization code interception attacks.

### MCP Client Creation

Uses stable `createMCPClient` API from `@ai-sdk/mcp` v1.0.18+:

```typescript
const client = await createMCPClient({
  transport: {
    type: "http",
    url: "https://server.smithery.ai/{namespace}",
    authProvider: AlpacaOAuthProvider
  }
});
```

The AI SDK handles:
- SSE connection management
- OAuth flow coordination
- Token refresh
- Error handling

### Tools Caching

Tools are cached after successful connection for instant access:

```typescript
const tools = await client.tools();
state.toolsCache.set(namespace, tools);
```

**Benefits:**
- No network latency when mentioning server in composer
- Tools available immediately in autocomplete
- Reduced API calls to MCP servers
- Better user experience

### Parallel Reconnection

On app startup, all servers reconnect in parallel for speed:

```typescript
await Promise.allSettled(
  namespaces.map(namespace => connectWithRetry(namespace))
);
```

Individual failures don't block other servers from connecting.

---

## Troubleshooting

### OAuth stuck in loading state

**Symptoms:** Loading spinner never stops after OAuth redirect

**Causes:**
1. OAuth callback never received (deep link not registered)
2. Timeout not working (code bug)
3. Auth state not reset on error

**Solutions:**
- Check Electron deep link registration in `main.ts`
- Verify timeout is set (5 minutes in `oauth-provider.ts`)
- Check console for errors during OAuth callback
- Restart app to clear stuck state

### Duplicate OAuth browser windows

**Symptoms:** Two browser windows open for single connection attempt

**Solution:** This bug has been fixed with time-based debouncing (3-second window). If you still see this issue:
- Check that `oauth-provider.ts` has `_lastRedirectTime` field
- Verify debouncing logic is in place in `redirectToAuthorization()`
- Check console for `[OAUTH-DEBOUNCE]` logs

### Server shows as disconnected after restart

**Symptoms:** Server was connected before restart, now shows disconnected

**Causes:**
1. No tokens in storage (user never completed OAuth)
2. Tokens expired and refresh failed
3. Server endpoint changed/unavailable

**Solutions:**
- Check storage: `servers::remote::{namespace}` has `tokens` field
- Try disconnecting and reconnecting to get fresh tokens
- Check network connectivity to `server.smithery.ai`

### Tools not available in composer

**Symptoms:** Cannot @mention MCP server or tools don't appear

**Causes:**
1. Server not connected (MCP client not active)
2. Tools not cached after connection
3. Error during tool caching

**Solutions:**
- Check connection status with `listConnectedServers()`
- Look for tool caching errors in console
- Try disconnecting and reconnecting to refresh tools
- Check MCP server is returning tools correctly

### Connection fails after OAuth

**Symptoms:** OAuth succeeds but connection still fails

**Causes:**
1. Network error during reconnection
2. Server endpoint unavailable
3. Tokens valid but MCP server rejecting connection

**Solutions:**
- This is a "partial success" scenario (tokens saved but connection failed)
- UI should show retry option
- Check network connectivity
- Try manual reconnect from UI
- Check MCP server status at Smithery

---

## Resources

**Official Documentation:**
- [AI SDK MCP Documentation](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools) - Integration guide and API reference
- [Smithery Documentation](https://smithery.ai/docs) - MCP server marketplace and hosting
- [MCP Specification](https://modelcontextprotocol.io/specification) - Official protocol specification
- [MCP OAuth Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization) - OAuth 2.0 integration

**Related Technologies:**
- [Electron Store](https://github.com/sindresorhus/electron-store) - Encrypted local storage
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/) - Authorization code flow with proof key

**Alpaca Resources:**
- [Main README](../../../../README.md) - Alpaca project overview
- [MCP Settings UI](../../../renderer/components/settings/servers.tsx) - User interface for MCP servers
