import { ipcMain } from "electron";

import composer from "~/main/ai/agents/composer";
import storage from "~/main/utils/storage";

ipcMain.handle("set-storage", (_event, key: string, value: any) => {
  storage.store.set(key, value);
  return true;
});

ipcMain.handle("get-storage", (_event, key: string) => {
  return storage.store.get(key);
});

ipcMain.handle("set-secure-storage", (_event, key: string, value: string) => {
  storage.secureStore.set(key, value);
  return true;
});

ipcMain.handle("get-secure-storage", (_event, key: string) => {
  return storage.secureStore.get(key);
});

ipcMain.handle("set-settings", (_event, settings) => {
  storage.store.set("username", settings.username);
  storage.store.set("customInstructions", settings.customInstructions);
  return true;
});

ipcMain.handle("get-settings", () => {
  return {
    username: storage.store.get("username", ""),
    customInstructions: storage.store.get("customInstructions", ""),
  };
});

ipcMain.handle("save-provider-config", (_event, config) => {
  storage.secureStore.set(`${config.provider}-provider-api-key`, config.apiKey);
  storage.store.set(`${config.provider}-provider-config`, {
    provider: config.provider,
    model: config.model,
    name: config.name,
    baseUrl: config.baseUrl,
  });
  return true;
});

ipcMain.handle("get-provider-config", (_event, provider: string) => {
  return {
    apiKey: storage.secureStore.get(`${provider}-provider-api-key`),
    config: storage.store.get(`${provider}-provider-config`, {}),
  };
});

// // Get API key for specific provider
// ipcMain.handle("get-provider-api-key", async (event, provider: string) => {
//   return mainGetSecure(`apiKey_${provider}`, "");
// });

// // Get Ollama models
// ipcMain.handle("get-ollama-models", async () => {
//   try {
//     const fetch = require("node-fetch");
//     const response = await fetch("http://localhost:11434/api/tags");
//     const data = await response.json();
//     return data.models?.map((model: any) => model.name) || [];
//   } catch (error) {
//     console.error("Failed to fetch Ollama models:", error);
//     return ["kimi-k2.5:cloud"]; // fallback
//   }
// });

// // AI Composer handler
// ipcMain.on("ai-compose", async (event, prompt: string) => {
//   try {
//     const agent = composer([]);

//     const result = await agent?.generate({
//       prompt,
//       onStepFinish: (step) => {
//         // Extract text from step content for UI
//         const textContent = step.content?.find((c) => c.type === "text");
//         const stepWithText = { ...step, text: textContent?.text || step.text };

//         event.reply("ai-step", stepWithText);
//       },
//     });

//     event.reply("ai-complete", result);
//   } catch (error) {
//     console.error("AI Error:", error);
//     event.reply("ai-error", error.message);
//   }
// });
