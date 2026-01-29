import { useState, useEffect } from "react";
import * as Mention from "@diceui/mention";
import { Dialog, DialogContent } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "../ui/avatar";
import { Kbd, KbdGroup } from "../ui/kbd";

const mcps = [
  {
    id: "1",
    name: "Linear",
    icon: "https://www.svgrepo.com/show/333141/linear.svg",
  },
  {
    id: "2",
    name: "Gmail",
    icon: "https://www.svgrepo.com/show/452213/gmail.svg",
  },
  {
    id: "3",
    name: "Slack",
    icon: "https://www.svgrepo.com/show/452102/slack.svg",
  },
  {
    id: "4",
    name: "Outlook",
    icon: "https://www.svgrepo.com/show/373951/outlook.svg",
  },
];

export function Prompt() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        setValue([]);
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const onHandleSumbit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.metaKey) {
      console.log((e.target as HTMLInputElement).value);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md overflow-visible p-2 rounded-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          <Mention.MentionRoot
            value={value}
            onValueChange={(newValue) => setValue([...new Set(newValue)])}
            className="w-full **:data-tag:rounded **:data-tag:bg-blue-200 **:data-tag:py-px **:data-tag:text-blue-950 dark:**:data-tag:bg-blue-800 dark:**:data-tag:text-blue-50"
          >
            <Mention.MentionInput
              onKeyDown={onHandleSumbit}
              placeholder="Type @ to mention someone..."
              className="flex min-h-[60px] w-full rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              asChild
            >
              <textarea />
            </Mention.MentionInput>
            <Mention.MentionContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-[60] min-w-[var(--dice-anchor-width)] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
              {mcps.map((mcp) => (
                <Mention.MentionItem
                  key={mcp.id}
                  value={mcp.name}
                  className="relative flex items-center gap-1.5 w-full cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-zinc-100 data-highlighted:text-zinc-900 data-disabled:opacity-50 dark:data-highlighted:bg-zinc-800 dark:data-highlighted:text-zinc-50"
                >
                  <Avatar size="xs">
                    <AvatarImage src={mcp.icon} />
                    <AvatarFallback>{mcp.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{mcp.name}</span>
                </Mention.MentionItem>
              ))}
            </Mention.MentionContent>
          </Mention.MentionRoot>

          <div className="min-h-[32px] flex items-center justify-between">
            {value.length > 0 ? (
              <AvatarGroup>
                {value.map((mention, index) => {
                  const mcp = mcps.find((m) => m.name === mention);
                  return (
                    <Avatar
                      key={index}
                      size="sm"
                      className="border-2 border-black bg-white"
                    >
                      <AvatarImage
                        src={mcp?.icon}
                        className="object-contain p-1"
                      />
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
                <Kbd>⌘</Kbd>
                <Kbd>return</Kbd>
              </KbdGroup>
              <span className="ml-1">to send</span>
              <span className="mx-2">/</span>
              <Kbd>esc</Kbd>
              <span className="ml-1">to cancel</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
