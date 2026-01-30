import { stepCountIs, type Tool, ToolLoopAgent, tool } from "ai";
import { z } from "zod";

import { composerPrompt } from "@/main/ai/prompt/composer";
import ollama from "@/main/ai/providers/ollama";

function composer(tools: Tool[]) {
  try {
    const composer = new ToolLoopAgent({
      instructions: composerPrompt,
      model: ollama("kimi-k2.5:cloud"),
      stopWhen: stepCountIs(128),
      tools: {
        weather: tool({
          description: "Get the weather in a location (in Fahrenheit)",
          inputSchema: z.object({
            location: z.string().describe("The location to get the weather for"),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
        }),
        convertFahrenheitToCelsius: tool({
          description: "Convert temperature from Fahrenheit to Celsius",
          inputSchema: z.object({
            temperature: z.number().describe("Temperature in Fahrenheit"),
          }),
          execute: async ({ temperature }) => {
            const celsius = Math.round((temperature - 32) * (5 / 9));
            return { celsius };
          },
        }),
      },
    });

    return composer;
  } catch (error) {
    console.error(error);
  }
} // composer().generate(prompt)

export default composer;
