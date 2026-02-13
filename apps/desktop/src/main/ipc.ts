import { ipcMain, shell } from "electron";

import composer from "~/main/ai/agents/composer";
import { model } from "~/main/ai/providers";
import remote from "~/main/mcp/remote";
import smitheryService from "~/main/services/smithery";
import storage from "~/main/utils/storage";

ipcMain.handle("set-storage", (_event, key: string, value: any) => {
  storage.set(key, value);

  // Reload AI model if provider config changed
  if (key.startsWith("provider::")) {
    model.reload();
  }

  return true;
});

ipcMain.handle("get-storage", (_event, key: string) => {
  return storage.get(key);
});

ipcMain.handle("search-remote-mcp-servers", async (_event, term: string) => {
  try {
    return await smitheryService.searchServers(term);
  } catch (error) {
    console.error("MCP search error:", error);
    throw error;
  }
});

ipcMain.handle("connect-remote-server", async (_event, server: any) => {
  try {
    const result = await remote.connectServer(server);
    // Return the full result with proper typing
    return result.reAuth ? { success: false, reAuth: true } : { success: true, reAuth: false };
  } catch (error) {
    console.error("Error connecting to remote MCP:", error);
    throw error;
  }
});

ipcMain.handle("disconnect-remote-server", async (_event, namespace: string) => {
  try {
    await remote.disconnectServer(namespace);
    return { success: true };
  } catch (error) {
    console.error("MCP disconnect error:", error);
    throw error;
  }
});

ipcMain.handle("list-connected-remote-servers", async () => {
  try {
    return remote.listConnectedServers();
  } catch (error) {
    console.error("MCP list error:", error);
    throw error;
  }
});

ipcMain.handle("complete-mcp-oauth", async (_event, namespace: string, authCode: string) => {
  try {
    const result = await remote.completeOAuth(namespace, authCode);
    return result;
  } catch (error) {
    console.error("OAuth completion error:", error);
    throw error;
  }
});

// AI Composer handler
ipcMain.on("ai-compose", async (event, prompt: string | null, mentions?: string[], messages?: any[]) => {
  try {
    // Get MCP tools based on mentions (from cache - instant)
    let mcpTools = {};

    if (mentions && mentions.length > 0) {
      mcpTools = remote.getToolsFromServers(mentions);
    }

    // Create composer agent with MCP tools
    const agent = composer(mcpTools);

    if (!agent) {
      throw new Error("Failed to create composer agent");
    }

    // Generate response with streaming steps
    // If messages array is provided, use it; otherwise use prompt
    const onStepFinishHandler = (step: any) => {
      // Extract text from step content for UI
      const textContent = step.content?.find((c: any) => c.type === "text");
      const stepWithText = { ...step, text: textContent?.text || step.text };

      event.reply("ai-step", stepWithText);
    };

    console.log(messages);
    const result =
      messages && messages.length > 0
        ? await agent.generate({ messages, onStepFinish: onStepFinishHandler })
        : await agent.generate({ prompt: prompt!, onStepFinish: onStepFinishHandler });

    event.reply("ai-complete", result);
  } catch (error: any) {
    console.error("AI Compose error:", error);
    event.reply("ai-error", error?.message || "Unknown error occurred");
  }
});

// Open URL in system browser
ipcMain.handle("open-external-link", async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error("Failed to open external URL:", error);
    throw error;
  }
});
