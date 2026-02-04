## Flow

### 1. **User Clicks "Install" on MCP Server**

```typescript
const result = await remote.connectServer({
  namespace: "gmail",
  displayName: "Gmail",
  iconUrl: "...",
  verified: true,
  homepage: "..."
});
```

**What happens:**

1. Creates `OAuthClientProvider` for the namespace
2. Provider checks secure storage for saved tokens (`mcp-{namespace}-auth`)
3. If tokens exist → loads them
4. Creates MCP client with the provider
5. Tries to connect to server

**Two paths from here:**

#### Path A: Has Valid Tokens

```
✓ Tokens exist in storage
✓ Server accepts them
✓ Client connection established
✓ Returns { reAuth: false }
✓ Saves server to connected list
```

#### Path B: Needs OAuth

```
✗ No tokens (or expired)
✗ Server returns 401 Unauthorized
✓ OAuth flow automatically starts (browser opens)
✓ Returns { reAuth: true }
✓ UI sets pendingOAuthNamespace and keeps button disabled
```

---

### 2. **OAuth Flow (Path B)**

When `needsAuth: true`:

```
1. AI SDK calls: authProvider.redirectToAuthorization(authUrl)
   └─> Opens browser to: https://server.smithery.ai/exa/oauth/authorize?...

2. User logs in and authorizes in browser

3. Browser redirects to: integral.computer://oauth/callback?code=ABC123&state=...

4. Your app catches this deep link (need to implement this part)

5. Your app calls the token exchange (need to implement this part)

6. AI SDK calls: authProvider.saveTokens(tokens)
   └─> Saves to: secure::mcp::exa::auth
   └─> { tokens: {...}, clientInfo: {...}, updatedAt: "..." }

7. Connection completes, tools are available
```

---

### 3. **On App Startup**

```typescript
// main.ts
await remote.reconnectAll();
```

**What happens:**

1. Reads `mcp-connected-servers` from storage → `["exa", "brave-search"]`
2. For each server:
   - Creates `OAuthClientProvider("exa")`
   - Provider loads tokens from `secure::mcp::exa::auth`
   - If tokens exist → creates MCP client
   - If no tokens → skips (user needs to re-auth)
3. All servers with valid tokens are reconnected

---

### 4. **Disconnect Flow**

```typescript
await remote.disconnectServer("exa");
```

**What happens:**

1. Closes MCP client connection
2. Removes from active connections map
3. Updates `mcp-connected-servers` list
4. **Note**: Tokens remain in storage (for quick reconnect)

To fully delete tokens:

```typescript
const provider = new OAuthClientProvider("exa");
provider.deleteTokens(); // Removes from secure storage
```

---

## Visual Flow Diagram

```
User Clicks Install
       │
       ▼
connectServer(server)
       │
       ├─> OAuthClientProvider created
       │   └─> Loads tokens from secure storage (mcp-{namespace}-auth)
       │
       ├─> Creates MCP client
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
       │              ├─> Browser opens for OAuth
       │              ├─> Returns { reAuth: true }
       │              ├─> UI sets pendingOAuthNamespace
       │              └─> Button stays disabled
       │                          │
       ▼                          ▼
   SUCCESS              User authorizes in browser
       │                          │
       │                          ▼
       │              integral.computer://oauth/callback?code=...
       │                          │
       │                          ▼
       │              IPC event: mcp-oauth-callback
       │                          │
       │                          ▼
       │              completeOAuth(namespace, code)
       │                          │
       │              ├─> Exchange code for tokens
       │              ├─> saveTokens() → secure storage
       │              └─> Reconnect with new tokens
       │                          │
       └──────────────────────────┘
                     │
                     ▼
              Save to connected list
                     │
                     ▼
           Connection established!
```

---

## Storage

### Secure Storage (Encrypted)

**Location**: OS Keychain (macOS Keychain, Windows Credential Vault, Linux Secret Service)

**Format**: `secure::mcp::{namespace}::auth`

```json
{
  "tokens": {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 3600
  },
  "clientInfo": {
    "client_id": "...",
    "client_secret": "..."
  },
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Regular Storage

**Key**: `mcp-connected-servers`

**Value**: `["exa", "brave-search", ...]`

## Resources

- [Vercel AI SDK MCP Documentation](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- [Smithery Documentation](https://smithery.ai/docs)
- [MCP OAuth Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
