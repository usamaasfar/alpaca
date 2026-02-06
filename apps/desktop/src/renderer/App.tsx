import { useState } from "react";
import { Toaster } from "sonner";
import { useKeyboardShortcuts } from "~/renderer/hooks/use-keyboard-shortcuts";
import { useMCPReconnect } from "~/renderer/hooks/use-mcp-reconnect";
import ComposerScreen from "~/renderer/screens/composer";
import SettingsScreen from "~/renderer/screens/settings";

const App = () => {
  const [showSettings, setShowSettings] = useState(false);

  // Handle MCP server reconnection status
  useMCPReconnect();

  // Handle keyboard shortcuts
  useKeyboardShortcuts({ showSettings, setShowSettings });

  return (
    <main className="relative h-full w-full overflow-hidden">
      <div className="fixed inset-x-0 top-0 h-8 app-drag-region z-50" aria-hidden="true" />
      {showSettings ? <SettingsScreen /> : <ComposerScreen />}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{ style: { background: "#1f1f1f", border: "1px solid #2f2f2f", color: "#fff" } }}
      />
    </main>
  );
};

export default App;
