import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, CircleCheck, CircleX, ExternalLink, Info, LoaderCircle, Search, Server, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "~/renderer/components/ui/avatar";
import { Badge } from "~/renderer/components/ui/badge";
import { Button } from "~/renderer/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/renderer/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/renderer/components/ui/dialog";
import { FieldGroup } from "~/renderer/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/renderer/components/ui/input-group";
import { ScrollArea } from "~/renderer/components/ui/scroll-area";
import { type server, useServersStore } from "~/renderer/stores/servers";

const formSchema = z.object({ term: z.string() });

export const SettingsRemoteServers = () => {
  const { isSearchingServers, searchServers, completeOAuthFlow } = useServersStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { term: "" },
  });

  const term = useWatch({ control: form.control, name: "term" });

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.term) searchServers(value.term);
    });
    return () => subscription.unsubscribe();
  }, [searchServers, form]);

  useEffect(() => {
    const handleOAuthCallback = async (data: { code: string; state: string }) => {
      console.log("🔐 OAuth callback received");
      await completeOAuthFlow(data.code);
    };

    const cleanup = window.electronAPI.onMCPOAuthCallback(handleOAuthCallback);
    return cleanup;
  }, [completeOAuthFlow]);

  return (
    <Card className="relative h-full flex flex-col rounded-t-none">
      <CardHeader>
        <CardDescription>Discover and connect MCP servers</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 h-0">
        <CardContent className="h-full">
          <form>
            <FieldGroup>
              <Controller
                name="term"
                control={form.control}
                render={({ field }) => (
                  <InputGroup>
                    <InputGroupAddon>
                      {isSearchingServers && term ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </InputGroupAddon>
                    <InputGroupInput {...field} placeholder="Search MCP servers..." />
                    {field.value && (
                      <InputGroupAddon align="inline-end">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => field.onChange("")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                )}
              />
            </FieldGroup>
          </form>
          <div className="mt-4">{term ? <SearchServers /> : <ConnectedServers />}</div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

const SearchServers = () => {
  const {
    isSearchingServers,
    getConnectedServers,
    connectServer,
    disconnectServer,
    isServerConnecting,
    isServerDisconnecting,
    serverSearchResults,
    pendingOAuthNamespace,
  } = useServersStore();
  const [connectedServers, setConnectedServers] = useState<Record<string, server & { connected: boolean }>>(null);
  const [disconnectingServer, setDisconnectingServer] = useState<string | null>(null);
  const [connectingServer, setConnectingServer] = useState<string | null>(null);

  useEffect(() => {
    const getServers = async () => {
      isServerConnecting;
      isServerDisconnecting;
      connectingServer;
      disconnectingServer;

      const servers = await getConnectedServers();
      setConnectedServers(servers);
    };

    getServers();
  }, [getConnectedServers, isServerConnecting, isServerDisconnecting, connectingServer, disconnectingServer]);

  const handleDisconnectServer = async (server: server) => {
    setDisconnectingServer(server.namespace);
    try {
      await disconnectServer(server.namespace);
      console.log(`Disconnected from ${server.displayName}`);
    } catch (error) {
      console.error("Disconnect error:", error);
      alert(`Error disconnecting from ${server.displayName}: ${error.message}`);
    } finally {
      setDisconnectingServer(null);
    }
  };

  const handleConnectServer = async (server: server) => {
    setConnectingServer(server.namespace);
    try {
      const result = await connectServer({
        namespace: server.namespace,
        displayName: server.displayName,
        iconUrl: server.iconUrl,
        verified: server.verified,
        homepage: server.homepage,
      });
      console.log(result);
    } catch (error) {
      console.error("Connection error:", error);
      alert(`Error connecting to ${server.displayName}: ${error.message}`);
    } finally {
      setConnectingServer(null);
    }
  };

  if (isSearchingServers) return <div>Searching for servers...</div>;

  return (
    <div>
      {serverSearchResults.map((server) => (
        <Dialog key={server.id}>
          <DialogTrigger asChild>
            <div className="h-11 flex items-center gap-2 p-2 rounded-md hover:bg-accent">
              <Avatar className="h-5 w-5 rounded-xs">
                <AvatarImage src={server.iconUrl || undefined} alt={server.displayName} />
                <AvatarFallback>
                  <Server className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <p>{server.displayName}</p>
                {connectedServers[server.namespace] && <Badge className="gap-1 bg-blue-600">Installed</Badge>}
                {server.verified && (
                  <Badge className="gap-1 bg-green-600">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  window.electronAPI.openExternalLink(server.homepage);
                }}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </DialogTrigger>

          <DialogContent showCloseButton={false} className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 rounded-xs">
                    <AvatarImage src={server.iconUrl || undefined} alt={server.displayName} />
                    <AvatarFallback>
                      <Server className="h-7 w-7" />
                    </AvatarFallback>
                  </Avatar>

                  {server.displayName}
                  {server.verified && (
                    <Badge className="gap-1 bg-green-600">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.electronAPI.openExternalLink(server.homepage);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{server.description}</p>
              </div>
            </div>

            <DialogFooter className="w-full flex gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">
                  Close
                </Button>
              </DialogClose>

              {connectedServers[server.namespace] && connectedServers[server.namespace].connected ? (
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={disconnectingServer === server.namespace}
                  onClick={() => handleDisconnectServer(server)}
                >
                  {disconnectingServer === server.namespace ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                      Disconnecting...
                    </>
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  disabled={isSearchingServers || connectingServer === server.namespace || pendingOAuthNamespace === server.namespace}
                  onClick={async () => handleConnectServer(server)}
                >
                  {connectingServer === server.namespace || pendingOAuthNamespace === server.namespace ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    "Install"
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
};

const ConnectedServers = () => {
  const {
    getConnectedServers,
    isConnectedServersLoading,
    disconnectServer,
    isServerConnecting,
    isServerDisconnecting,
    connectServer,
    pendingOAuthNamespace,
  } = useServersStore();
  const [disconnectingServer, setDisconnectingServer] = useState<string | null>(null);
  const [connectingServer, setConnectingServer] = useState<string | null>(null);
  const [connectedServers, setConnectedServers] = useState<Record<string, server & { connected: boolean }>>(null);

  useEffect(() => {
    const getServers = async () => {
      isServerConnecting;
      isServerDisconnecting;
      connectingServer;
      disconnectingServer;

      const servers = await getConnectedServers();
      setConnectedServers(servers);
    };

    getServers();
  }, [getConnectedServers, isServerConnecting, isServerDisconnecting, connectingServer, disconnectingServer]);

  const handleDisconnect = async (namespace: string) => {
    setDisconnectingServer(namespace);
    try {
      await disconnectServer(namespace);
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
    setDisconnectingServer(null);
  };

  const handleReconnect = async (server: server) => {
    setConnectingServer(server.namespace);
    try {
      await connectServer(server);
    } catch (error) {
      console.error("Failed to reconnect:", error);
    }
    setConnectingServer(null);
  };

  if (isConnectedServersLoading || !connectedServers)
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Loading connected servers...</p>
      </div>
    );

  if (Object.keys(connectedServers).length === 0)
    return (
      <div className="text-center py-8">
        <Server className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No connected servers</p>
        <p className="text-xs text-muted-foreground mt-1">Search above to discover and connect MCP servers</p>
      </div>
    );

  return (
    <div className="space-y-2 mt-4">
      <p className="text-sm font-medium mb-3">Remote Servers</p>
      {Object.keys(connectedServers).map((server) => (
        <div key={server} className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-center gap-3">
            <Avatar className="h-5 w-5 rounded-xs">
              {connectedServers[server].iconUrl && (
                <AvatarImage src={connectedServers[server].iconUrl} alt={connectedServers[server].displayName} />
              )}
              <AvatarFallback>
                <Server className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center">
              <p className="text-sm font-medium">{connectedServers[server].displayName} </p>
              {connectedServers[server].verified && <BadgeCheck className="w-4 h-4 ml-2.5 text-green-600" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connectedServers[server].connected ? (
              <>
                <Button variant="outline" size="sm" disabled={disconnectingServer === server} onClick={() => handleDisconnect(server)}>
                  {disconnectingServer === server ? (
                    <>
                      <LoaderCircle className="h-3 w-3 animate-spin mr-2" />
                      Disconnecting...
                    </>
                  ) : (
                    "Disconnect"
                  )}
                </Button>
                <Badge className="bg-green-600">
                  <CircleCheck data-icon="inline-start" />
                  Connected
                </Badge>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={connectingServer === server || pendingOAuthNamespace === server}
                  onClick={() => handleReconnect(connectedServers[server])}
                >
                  {connectingServer === server || pendingOAuthNamespace === server ? (
                    <>
                      <LoaderCircle className="h-3 w-3 animate-spin mr-2" />
                      Reconnecting...
                    </>
                  ) : (
                    "Reconnect"
                  )}
                </Button>
                <Button variant="outline" size="sm" disabled={disconnectingServer === server} onClick={() => handleDisconnect(server)}>
                  {disconnectingServer === server ? (
                    <>
                      <LoaderCircle className="h-3 w-3 animate-spin mr-2" />
                      Removing...
                    </>
                  ) : (
                    "Remove"
                  )}
                </Button>
                <Badge className="bg-red-600">
                  <CircleX data-icon="inline-start" />
                  Disconnected
                </Badge>
              </>
            )}
          </div>
        </div>
      ))}
      <p className="flex items-center text-xs text-muted-foreground mt-4 pt-4 border-t">
        <Info className="w-3.5 h-3.5 mr-1 text-yellow-600" /> If you're having trouble connecting or reconnecting to MCP servers, try
        quitting and reopening Alpaca.
      </p>
    </div>
  );
};
