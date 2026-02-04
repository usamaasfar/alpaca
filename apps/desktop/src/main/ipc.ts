import { ipcMain, shell } from "electron";

import composer from "~/main/ai/agents/composer";
import remote from "~/main/mcp/remote";
import ollama from "~/main/services/ollama";
import smitheryService from "~/main/services/smithery";
import storage from "~/main/utils/storage";

ipcMain.handle("set-storage", (_event, key: string, value: any) => {
  storage.store.set(key, value);
  return true;
});

ipcMain.handle("get-storage", (_event, key: string) => {
  return storage.store.get(key);
});

ipcMain.handle("set-secure-storage", (_event, key: string, value: any) => {
  storage.secureStore.set(key, value);
  return true;
});

ipcMain.handle("get-secure-storage", (_event, key: string) => {
  return storage.secureStore.get(key);
});

ipcMain.handle("get-ollama-health", async () => {
  return await ollama.health();
});

ipcMain.handle("get-ollama-models", async () => {
  return await ollama.models();
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

    if (result.reAuth) return { success: false, reAuth: true };
    else return { success: true };
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
ipcMain.on("ai-compose", async (event, prompt: string, mentions?: string[]) => {
  try {
    console.log(`📝 AI Compose request received:`, { prompt, mentions });

    // Get MCP tools for mentioned namespaces
    const mcpTools = {};
    if (mentions && mentions.length > 0) {
      console.log(`📦 Loading tools for mentions: ${mentions.join(", ")}`);
      // TODO: Update to use remote.ts instead of mcpManager
      // mcpTools = mcpManager.getToolsForMentions(mentions);
      console.log(`✅ Loaded ${Object.keys(mcpTools).length} MCP tools`);
    } else {
      console.log(`⚠️ No mentions provided - only static tools will be available`);
      console.log(`💡 Tip: Use @mention in the UI to include MCP server tools`);
    }

    const agent = composer(mcpTools);

    const result = await agent?.generate({
      prompt,
      onStepFinish: (step) => {
        // Extract text from step content for UI
        const textContent = step.content?.find((c) => c.type === "text");
        const stepWithText = { ...step, text: textContent?.text || step.text };

        event.reply("ai-step", stepWithText);
      },
    });

    event.reply("ai-complete", result);
  } catch (error) {
    console.error("AI Error:", error);
    event.reply("ai-error", error.message);
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
