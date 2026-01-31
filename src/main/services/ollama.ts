const OLLAMA_BASE_URL = "http://localhost:11434";

interface ModelSummary {
  name: string;
}

interface ListResponse {
  models: ModelSummary[];
}

export default {
  health: async () => {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/version`);
      return response.ok;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
  models: async () => {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      const data: ListResponse = await response.json();
      return data.models.map((model) => model.name) || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  },
};
