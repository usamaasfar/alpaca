import { BadgeCheck, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/renderer/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader } from "~/renderer/components/ui/card";
import { Input } from "~/renderer/components/ui/input";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import { useSettingsStore } from "~/renderer/stores/settings";

export const SettingsServersRemote = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    connectedMCPs,
    searchResults,
    isSearching,
    isConnecting,
    searchMCPs,
    connectMCP,
    disconnectMCP,
    loadConnectedMCPs,
    handleOAuthCallback,
  } = useSettingsStore();

  useEffect(() => {
    loadConnectedMCPs();
  }, [loadConnectedMCPs]);

  // Set up OAuth callback listener
  useEffect(() => {
    const handleCallback = (data: { code: string; state: string }) => {
      console.log("OAuth callback received:", data);
      handleOAuthCallback(data.code, data.state);
    };

    window.electronAPI.onMCPOAuthCallback(handleCallback);

    return () => {
      // Clean up listener on unmount
      window.electronAPI.removeAllOAuthListeners();
    };
  }, [handleOAuthCallback]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchMCPs(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchMCPs]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleConnect = async (server: any) => {
    await connectMCP(server);
  };

  const handleDisconnect = async (namespace: string) => {
    await disconnectMCP(namespace);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      handleSearch(searchTerm);
    }
  };

  const showSearchResults = searchTerm.length > 0;

  return (
    <Card className="h-full flex flex-col rounded-t-none">
      <CardHeader className="flex-shrink-0">
        <CardDescription>{showSearchResults ? "Discover and connect MCP servers" : "Manage your connected MCP servers"}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Discover MCP servers..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          {showSearchResults ? (
            /* Search Results */
            <div className="space-y-3">
              {isSearching ? (
                <div className="text-center text-muted-foreground">Searching...</div>
              ) : (
                searchResults.map((server, index) => (
                  <div
                    key={server.id || `server-${index}`}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleConnect(server)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={server.iconUrl} alt={server.displayName} />
                      <AvatarFallback>{server.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">{server.displayName}</p>
                        {server.verified && <BadgeCheck className="h-4 w-4 text-blue-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{server.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Connected MCPs */
            <div className="space-y-3">
              {connectedMCPs.map((mcp) => (
                <div key={mcp.namespace} className="flex items-center space-x-3 p-3 rounded-lg border">
                  <Avatar className="h-8 w-8 rounded-lg p-0.5">
                    <AvatarImage src={mcp.iconUrl} alt={mcp.displayName} />
                    <AvatarFallback>{mcp.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">{mcp.displayName}</p>
                      <div className="h-2 w-2 bg-green-500 rounded-full" title="Connected" />
                    </div>
                  </div>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleDisconnect(mcp.namespace)}
                    disabled={isConnecting}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Helper Text */}
        <div className="text-xs text-muted-foreground text-center">
          {showSearchResults
            ? isConnecting
              ? "Connecting..."
              : "Click to connect to a server"
            : `${connectedMCPs.length} server${connectedMCPs.length !== 1 ? "s" : ""} connected`}
        </div>
      </CardContent>
    </Card>
  );
};
