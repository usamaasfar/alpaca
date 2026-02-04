import * as Mention from "@diceui/mention";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "~/renderer/components/ui/avatar";
import { Dialog, DialogContent } from "~/renderer/components/ui/dialog";
import { Kbd, KbdGroup } from "~/renderer/components/ui/kbd";
import { type server, useServersStore } from "~/renderer/stores/servers";

export function Compose({
  onSubmit,
  externalOpen,
  onOpenChange,
  replyingTo
}: {
  onSubmit?: (prompt: string, mentions?: string[]) => Promise<any>;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  replyingTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string[]>([]);
  const [connectedMCPs, setConnectedMCPs] = useState<(server & { connected: boolean })[]>([]);
  const isTabCompletion = useRef(false);

  const { getConnectedServers } = useServersStore();

  // Sync external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  useEffect(() => {
    const loadServers = async () => {
      const servers = await getConnectedServers();
      // Convert Record to Array and filter only connected servers
      const connectedArray = Object.values(servers).filter((server) => server.connected);
      setConnectedMCPs(connectedArray);
    };
    loadServers();
  }, [getConnectedServers]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setValue([]);

        // Reload servers before opening
        const servers = await getConnectedServers();
        const connectedArray = Object.values(servers).filter((server) => server.connected);
        setConnectedMCPs(connectedArray);

        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getConnectedServers]);

  const onHandleSumbit = async (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    // Tab: Autocomplete mention (dispatch Enter to select from dropdown)
    if (e.key === "Tab") {
      e.preventDefault();
      isTabCompletion.current = true;
      const target = e.target as HTMLTextAreaElement;
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
      // Reset flag after a tick
      setTimeout(() => {
        isTabCompletion.current = false;
      }, 0);
      return;
    }

    // Enter: Send message (but not if triggered by Tab completion)
    if (e.key === "Enter" && !e.shiftKey && !isTabCompletion.current) {
      e.preventDefault();
      const prompt = (e.target as HTMLTextAreaElement).value;

      // Extract mentions from the value array (these are the @mentioned MCPs)
      const mentions = value.map((mention) => {
        const mcp = connectedMCPs.find((m) => m.displayName === mention);
        return mcp?.namespace || mention.toLowerCase();
      });

      try {
        if (onSubmit) {
          await onSubmit(prompt, mentions);
        } else {
          // Use electron API with mentions - ensure we pass an array even if empty
          window.electronAPI.aiCompose(prompt, mentions.length > 0 ? mentions : []);
        }
      } catch (error) {
        console.error("Error:", error);
      }

      setOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md overflow-visible p-2 rounded-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          {replyingTo && (
            <div className="px-2 py-1.5 border-l-2 border-blue-500 bg-muted/50">
              <div className="text-xs text-muted-foreground mb-0.5">Replying to</div>
              <div className="text-sm text-muted-foreground line-clamp-2">{replyingTo}</div>
            </div>
          )}
          <Mention.MentionRoot
            value={value}
            onValueChange={(newValue) => setValue([...new Set(newValue)])}
            className="w-full **:data-tag:rounded-xs **:data-tag:bg-blue-200 **:data-tag:py-px **:data-tag:text-blue-950 dark:**:data-tag:bg-blue-800 dark:**:data-tag:text-blue-50"
          >
            <Mention.MentionInput
              onKeyDown={onHandleSumbit}
              placeholder="Type @ to mention someone..."
              className="flex min-h-[60px] w-full bg-transparent px-2 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none resize-none border-none md:text-sm"
              asChild
            >
              <textarea />
            </Mention.MentionInput>
            <Mention.MentionContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-[60] min-w-[var(--dice-anchor-width)] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
              {connectedMCPs.map((mcp) => (
                <Mention.MentionItem
                  key={mcp.namespace}
                  value={mcp.displayName}
                  className="relative flex items-center gap-1.5 w-full cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-zinc-100 data-highlighted:text-zinc-900 data-disabled:opacity-50 dark:data-highlighted:bg-zinc-800 dark:data-highlighted:text-zinc-50"
                >
                  <Avatar size="xs">
                    <AvatarImage src={mcp.iconUrl} />
                    <AvatarFallback>{mcp.displayName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{mcp.displayName}</span>
                </Mention.MentionItem>
              ))}
            </Mention.MentionContent>
          </Mention.MentionRoot>

          <div className="min-h-[32px] flex items-center justify-between">
            {value.length > 0 ? (
              <AvatarGroup>
                {value.map((mention, index) => {
                  const mcp = connectedMCPs.find((m) => m.displayName === mention);
                  return (
                    <Avatar key={index} size="sm" className="border-2 border-black bg-white">
                      <AvatarImage src={mcp?.iconUrl} className="object-contain p-1" />
                      <AvatarFallback>{mention.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                  );
                })}
              </AvatarGroup>
            ) : (
              <div />
            )}
            <div className="text-xs text-muted-foreground">
              <KbdGroup>
                <span className="text-muted-foreground">Send</span>
                <Kbd>Enter</Kbd>
              </KbdGroup>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
