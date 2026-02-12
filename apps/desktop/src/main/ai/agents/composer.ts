import { stepCountIs, type Tool, ToolLoopAgent } from "ai";

import { truncate } from "~/main/ai/agents/tooling";
import composerPrompt from "~/main/ai/prompt/composer";
import { model } from "~/main/ai/providers";

/**
 * Create a composer agent with tools from MCP servers
 * @param mcpTools - Tools from connected MCP servers (from remote.getAllTools() or remote.getToolsFromServers())
 * @returns ToolLoopAgent configured with MCP tools
 */
function composer(mcpTools: Record<string, Tool> = {}) {
  try {
    const composer = new ToolLoopAgent({
      instructions: composerPrompt,
      model: model.load(),
      stopWhen: stepCountIs(128),
      tools: mcpTools,
      temperature: 0.7,
      prepareStep: async ({ messages }) => {
        const processed = truncate(messages);
        return { messages: processed };
      },
    });

    return composer;
  } catch (error) {
    console.error("Failed to create composer agent:", error);
    throw error;
  }
}

export default composer;
