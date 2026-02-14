# Server Manager

Manages MCP (Model Context Protocol) server connections with persistent configuration and runtime status tracking.

## Architecture

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ listServers(), addServer(), removeServer()
     │ enableServer(), disableServer(), reconnectServer()
     ↓
┌─────────────────┐
│ ServerManager   │
├─────────────────┤
│ • clients       │ ← Active MCP connections
│ • tools         │ ← Tools from servers
│ • status        │ ← Runtime connection state
└────┬────────────┘
     │
     ├──→ storage.ts (electron-store) ← Persistent config + enabled flag
     │
     ├──→ Local Servers (stdio)  ← command + arguments
     │
     └──→ Remote Servers (HTTP)  ← url + headers
```

## State Management

**Persistent State** (storage):

- Server configuration (name, type, config)
- `enabled` flag - user preference for auto-connect

**Runtime State** (memory):

- `clients` - Active MCP connections
- `tools` - Tools provided by each server
- `status` - Connection state (connected/connecting/disconnected/error)

## API

### Lifecycle

- `initialize()` - Auto-connect enabled servers on startup
- `destroy()` - Close all connections and clear state

### Server Operations

- `listServers()` - Get all servers with current status
- `addServer(server)` - Add and connect new server
- `removeServer(name)` - Remove server and disconnect
- `updateServer(oldName, newServer)` - Update server config and reconnect if active
- `enableServer(name)` - Enable and connect server
- `disableServer(name)` - Disable and disconnect server
- `reconnectServer(name)` - Retry failed connection

### Internal Methods

**Tools Management:**

- `_refreshTools()` - Refresh tools from all connected clients

**Connection Management:**

- `_connectServer(server)` - Connect to a server and update status
- `_disconnectServer(name)` - Disconnect from a server and update status

**Storage Operations:**

- `_getServersFromStorage()` - Load servers from storage
- `_saveServersToStorage(servers)` - Save servers to storage
- `_saveServerToStorage(server)` - Add new server to storage
- `_removeServerFromStorage(name)` - Remove server from storage
- `_updateServerInStorage(oldName, newServer)` - Update server in storage
