import { ToolLoopAgent } from "ai";
import { ipcMain } from "electron";
import { ollama } from "ollama-ai-provider-v2";
import { AGENT_INSTRUCTIONS } from "./ai/prompt";
import { MCPManager } from "./smithery";

const mcpManager = new MCPManager();

// Available MCPs (Gmail only for testing)
const availableMCPs = [{ name: "Gmail", url: "https://server.smithery.ai/gmail" }];

// Auto-reconnect saved MCPs on startup
async function autoReconnectMCPs() {
  for (const mcp of availableMCPs) {
    try {
      const result = await mcpManager.connectToMCP(mcp.name, mcp.url);
      if (result.success) {
        console.log(`🔄 Auto-reconnected ${mcp.name}`);
      }
    } catch (error) {
      console.log(`⚠️ Failed to auto-reconnect ${mcp.name}:`, error.message);
    }
  }
}

// Start auto-reconnection
autoReconnectMCPs();

// MCP OAuth handlers
ipcMain.handle("get-available-mcps", async () => {
  return availableMCPs;
});

ipcMain.handle("connect-mcp", async (event, mcpName: string) => {
  const mcp = availableMCPs.find((m) => m.name === mcpName);
  if (!mcp) {
    throw new Error(`MCP ${mcpName} not found`);
  }

  return await mcpManager.connectToMCP(mcp.name, mcp.url);
});

ipcMain.handle("finish-oauth", async (event, mcpName: string, authCode: string) => {
  const mcp = availableMCPs.find((m) => m.name === mcpName);
  if (!mcp) {
    throw new Error(`MCP ${mcpName} not found`);
  }

  return await mcpManager.finishOAuth(mcp.name, mcp.url, authCode);
});

ipcMain.handle("get-connected-mcps", async () => {
  return mcpManager.getConnectedMCPs();
});

// AI generation with MCP tools
ipcMain.on("generate-with-mcp", async (event, prompt: string) => {
  try {
    // Get connected MCPs and their tools
    const connectedMCPs = mcpManager.getConnectedMCPs();
    let allTools = {};

    // Aggregate tools from all connected MCPs
    for (const mcpName of connectedMCPs) {
      const mcpTools = mcpManager.getMCPTools(mcpName);
      allTools = { ...allTools, ...mcpTools };
    }

    console.log(`🛠️ Available tools: ${Object.keys(allTools).join(", ")}`);

    const agent = new ToolLoopAgent({
      model: ollama("glm-4.7:cloud"),
      tools: allTools, // Use AI SDK tools directly
      instructions: AGENT_INSTRUCTIONS,
      onStepFinish: ({ text }) => {
        event.reply("agent-step", text);
      },
    });

    const result = await agent.generate({ prompt });

    event.reply("generate-complete", {
      success: true,
      text: result.text,
      steps: result.steps.length,
    });
  } catch (error) {
    console.error("AI generation error:", error);
    event.reply("generate-error", {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
