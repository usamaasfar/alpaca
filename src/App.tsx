import { Prompt } from "./components/blocks/prompt";
import { MCPConnections } from "./components/mcp-connections";

const App = () => {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">AI Desktop App with MCPs</h1>

      {/* MCP Connection Management */}
      <div className="mb-8">
        <MCPConnections />
      </div>

      {/* AI Chat Interface */}
      <div>
        <Prompt />
      </div>
    </main>
  );
};

export default App;
