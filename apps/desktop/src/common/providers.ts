export const PROVIDERS = [
  {
    type: "ollama",
    name: "ollama",
    displayName: "Ollama",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/ollama.png",
  },
  {
    type: "openaiCompatible",
    name: "openaiCompatible",
    displayName: "OpenAI Compatible",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/openai.png",
  },
  {
    type: "openai",
    name: "openai",
    displayName: "OpenAI",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/openai.png",
  },
  {
    type: "anthropic",
    name: "anthropic",
    displayName: "Anthropic",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/claude.png",
  },
  {
    type: "google",
    name: "google",
    displayName: "Google",
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/gemini.png",
  },
] as const;

export type ProviderType = (typeof PROVIDERS)[number]["type"];
