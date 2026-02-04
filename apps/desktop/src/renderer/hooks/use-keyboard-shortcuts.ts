import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  showSettings: boolean;
  setShowSettings: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function useKeyboardShortcuts({ showSettings, setShowSettings }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Toggle settings
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setShowSettings((prev) => !prev);
      }
      // Escape: Close settings
      if (e.key === "Escape" && showSettings) {
        e.preventDefault();
        setShowSettings(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, setShowSettings]);
}
