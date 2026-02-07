import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "~/renderer/components/ui/alert-dialog";
import { Kbd, KbdGroup } from "~/renderer/components/ui/kbd";
import { useGeneralSettingsStore } from "~/renderer/stores/general";

export const Greetings = () => {
  const { username, getGeneralSettings } = useGeneralSettingsStore();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    getGeneralSettings();
  }, [getGeneralSettings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="text-3xl font-extralight">{getGreeting(username)}</div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground text-xs">
        <KbdGroup>
          <Kbd>Cmd</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
      </div>

      <AlertDialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Keyboard shortcuts</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-2 text-sm">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.label} className="flex items-center justify-between gap-4">
                <span className="text-foreground">{shortcut.label}</span>
                <KbdGroup>
                  {shortcut.keys.map((key) => (
                    <Kbd key={`${shortcut.label}-${key}`}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </div>
            ))}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const SHORTCUTS = [
  { label: "Start a new message", keys: ["N"] },
  { label: "Reply to message", keys: ["R"] },
  { label: "Complete server mention", keys: ["Tab"] },
  { label: "Open settings", keys: ["Cmd", "K"] },
  { label: "Back", keys: ["Esc"] },
] as const;

const getGreeting = (username: string) => {
  const hour = dayjs().hour();

  if (hour < 6) return `Hey, ${username}`;
  if (hour < 12) return `Good morning, ${username}`;
  if (hour < 17) return `Good afternoon, ${username}`;
  return `Good evening, ${username}`;
};
