import Smithery from "@smithery/api";

const client = new Smithery({ apiKey: "0d61b2e2-3b2e-4f04-b536-3cad6ca12431" });

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
      console.log("called... with", term);
      const response = await client.servers.list({ q: term, pageSize: 5 });
      return response.servers;
    } catch (error) {
      console.error("Smithery search error:", error);
      return [];
    }
  },
};
