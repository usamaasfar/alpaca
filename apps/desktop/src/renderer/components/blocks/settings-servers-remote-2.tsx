import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, ExternalLink, LoaderCircle, Search, Server, X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { useServersStore } from "~/renderer/stores/servers";

const formSchema = z.object({ term: z.string() });

export const SettingsRemoteServers = () => {
  const { getRemoteMCPSearchResults, isSearchingRemoteMCP } = useServersStore();

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { term: "" } });

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.term) getRemoteMCPSearchResults(value.term);
    });
    return () => subscription.unsubscribe();
  }, [form, getRemoteMCPSearchResults]);

  function onSubmit(data: z.infer<typeof formSchema>) {
    console.log(data);
  }

  return (
    <Card className="relative h-full flex flex-col rounded-t-none">
      <CardHeader>
        <CardDescription>Discover and connect MCP servers</CardDescription>
      </CardHeader>
      <ScrollArea className="flex-1 h-0">
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="term"
                control={form.control}
                render={({ field }) => (
                  <InputGroup>
                    <InputGroupAddon>
                      {isSearchingRemoteMCP ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
          <div className="mt-4">{form.watch("term") ? <SearchRemoteMCPServers /> : <ConnectedRemoteMCPServers />}</div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

const SearchRemoteMCPServers = () => {
  const { remoteMCPSearchResults, isSearchingRemoteMCP } = useServersStore();

  if (!isSearchingRemoteMCP)
    return (
      <div className="">
        {remoteMCPSearchResults.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">{isSearchingRemoteMCP ? "Searching..." : "No results found"}</div>
        ) : (
          <div>
            {remoteMCPSearchResults.map((server) => (
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
                      {server.verified && (
                        <Badge variant="secondary" className="gap-1 bg-green-600">
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
                          <Badge variant="secondary" className="gap-1 bg-green-600">
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

                    <Button className="flex-1">Install</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
    );
};

const ConnectedRemoteMCPServers = () => {
  return (
    <div>
      <p className="text-sm text-muted-foreground">Connected servers</p>
      <div className="text-sm">Dummy connected servers...</div>
    </div>
  );
};
