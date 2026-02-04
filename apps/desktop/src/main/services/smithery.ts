import Smithery from "@smithery/api";

const client = new Smithery({ apiKey: process.env.SMITHERY_API_KEY });

export default {
  health: async () => {
    try {
      const response = await client.health.check();
      return response.status === "ok";
    } catch (error) {
      console.error(error);
      return false;
    }
  },
  searchServers: async (term: string) => {
    try {
      const response = await client.servers.list({ q: term, pageSize: 5 });
      return response.servers;
    } catch (error) {
      console.error("Smithery search error:", error);
      return [];
    }
  },
};
