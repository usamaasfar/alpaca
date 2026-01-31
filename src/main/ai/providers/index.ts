import storage from "~/main/utils/storage";

const providers = {
  anthropic: require("~/main/ai/providers/anthropic"),
  cerebras: require("~/main/ai/providers/cerebras"),
  google: require("~/main/ai/providers/google"),
  groq: require("~/main/ai/providers/groq"),
  ollama: require("~/main/ai/providers/ollama"),
  openai: require("~/main/ai/providers/openai"),
  openaiCompatible: require("~/main/ai/providers/openai-compatible"),
  openrouter: require("~/main/ai/providers/openrouter"),
};

export const model = (() => {
  const model = storage.store.get("model") as {
    provider: keyof typeof providers;
    name: string;
  };

  return providers[model.provider](model.name);
})();
