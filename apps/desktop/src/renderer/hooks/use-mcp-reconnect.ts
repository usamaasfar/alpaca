import { useEffect, useRef } from "react";
import { toast } from "sonner";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function useMCPReconnect() {
  const toastId = useRef<string | number>("mcp-reconnect");

  useEffect(() => {
    const cleanup = window.electronAPI.onMCPReconnectStatus((status) => {
      console.log("MCP Reconnect Status:", status);

      if (status.type === "start") {
        // Show yellow warning toast while connecting
        if (status.total === 0) {
          toast.info("No servers to reconnect", { id: toastId.current });
        } else {
          toast.loading("Connecting servers...", {
            id: toastId.current,
            duration: Infinity, // Keep it open until we update it
          });
        }
      } else if (status.type === "complete") {
        // Show green success toast and auto-dismiss
        if (status.connected === 0) {
          toast.info("No servers connected", { id: toastId.current });
        } else {
          toast.success(`${status.connected} server${status.connected === 1 ? "" : "s"} connected`, {
            id: toastId.current,
            duration: 2000, // Auto-dismiss after 2 seconds
          });
        }
      }
    });

    return cleanup;
  }, []);
}
