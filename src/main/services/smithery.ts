import Smithery from "@smithery/api";

const client = new Smithery({ apiKey: process.env.SMITHEREY_API_KEY });

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
  search: async ({ term, verified }: { term: string; verified: Smithery.ServerListParams["verified"] }) => {
    try {
      const response = await client.servers.list({ q: term, verified });
      return response.servers;
    } catch (error) {
      console.error(error);
      return [];
    }
  },
  info: async (namespace: string) => {
    try {
      const response = await client.servers.get("server", { namespace });
      return response;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
};
