import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { McpMentionInput } from "./components/blocks/prompt";

const App = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [mcpStatus, setMcpStatus] = useState<
    { name: string; status: string }[]
  >([]);
  const [prompt, setPrompt] = useState<string>(
    "Find documentation for React hooks",
  );

  // Load MCP status on component mount
  useEffect(() => {
    window.electronAPI.getMCPStatus().then(setMcpStatus);
  }, []);

  const handleGenerateWithMCP = async () => {
    setLoading(true);
    setError(null);
    setAiResponse("");
    setAgentSteps([]);

    // Listen for events
    const stepListener = (step: string) =>
      setAgentSteps((prev) => [...prev, step]);
    const completeListener = (result: any) => {
      if (result.success) {
        setAiResponse(result.text || "");
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    const errorListener = (result: any) => {
      setError(result.error);
      setLoading(false);
    };

    window.electronAPI.onAgentStep(stepListener);
    window.electronAPI.onGenerateComplete(completeListener);
    window.electronAPI.onGenerateError(errorListener);

    // Send the request
    window.electronAPI.generateWithMCP(prompt);
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Agent with MCP Tools</h1>

      <div className="space-y-6">
        <McpMentionInput />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Prompt:</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your prompt..."
            />
          </div>
          <Button
            onClick={handleGenerateWithMCP}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Generating..." : "Generate with MCP Tools"}
          </Button>
        </div>

        {mcpStatus.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">MCP Servers:</h3>
            <div className="grid gap-2">
              {mcpStatus.map((server, index) => (
                <div
                  key={index}
                  className={`p-2 border rounded text-sm ${
                    server.status === "connected"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  {server.name} - {server.status}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {agentSteps.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Agent Steps:</h3>
            <div className="space-y-2">
              {agentSteps.map((step, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 border rounded text-sm"
                >
                  Step {index + 1}: {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {aiResponse && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">AI Response:</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="whitespace-pre-wrap">{aiResponse}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default App;
