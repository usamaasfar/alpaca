import { ipcMain, shell } from "electron";

import composer from "~/main/ai/agents/composer";
import { mcpManager } from "~/main/services/mcp";
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

// AI Composer handler
ipcMain.on("ai-compose", async (event, prompt: string, mentions?: string[]) => {
  try {
    console.log(`📝 AI Compose request received:`, { prompt, mentions });

    // Get MCP tools for mentioned namespaces
    let mcpTools = {};
    if (mentions && mentions.length > 0) {
      console.log(`📦 Loading tools for mentions: ${mentions.join(", ")}`);
      mcpTools = mcpManager.getToolsForMentions(mentions);
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

ipcMain.handle("connect-mcp-server", async (_event, serverConfig: any) => {
  try {
    // Use qualifiedName for both namespace and server URL (as per Smithery docs)
    const namespace = serverConfig.qualifiedName || serverConfig.namespace;
    const serverUrl = `https://server.smithery.ai/${namespace}`;
    const displayName = serverConfig.displayName;
    const iconUrl = serverConfig.iconUrl || "";

    console.log("Connecting to MCP server:", { namespace, serverUrl, displayName });

    // Try to connect (may return needsAuth if OAuth is required)
    const result = await mcpManager.connectToMCP(namespace, serverUrl, displayName, iconUrl);

    if (result.needsAuth) {
      // OAuth is required - return that we need auth
      // The AI SDK will have opened the browser already via redirectToAuthorization
      return {
        needsAuth: true,
        serverMetadata: {
          namespace,
          displayName,
          iconUrl,
          serverUrl,
        },
      };
    }

    // Connection succeeded
    return {
      success: true,
      serverMetadata: {
        namespace,
        displayName,
        iconUrl,
        serverUrl,
      },
    };
  } catch (error) {
    console.error("MCP connect error:", error);
    throw error;
  }
});

ipcMain.handle("finish-mcp-auth", async (_event, authCode: string, serverMetadata: any) => {
  try {
    const { namespace, serverUrl, displayName, iconUrl } = serverMetadata;
    console.log("Finishing OAuth for:", { namespace, serverUrl });

    const result = await mcpManager.finishOAuth(namespace, serverUrl, authCode, {
      displayName,
      iconUrl,
    });

    if (result.success) {
      console.log("OAuth completed successfully");
      return { success: true };
    } else {
      throw new Error(result.error || "OAuth failed");
    }
  } catch (error) {
    console.error("MCP auth finish error:", error);
    throw error;
  }
});

ipcMain.handle("disconnect-mcp-server", async (_event, namespace: string) => {
  try {
    await mcpManager.disconnectMCP(namespace);
    return { success: true };
  } catch (error) {
    console.error("MCP disconnect error:", error);
    throw error;
  }
});

ipcMain.handle("list-connected-mcps", async () => {
  try {
    return mcpManager.listConnectedServers();
  } catch (error) {
    console.error("MCP list error:", error);
    throw error;
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
