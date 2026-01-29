import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "../ui/avatar";
import { Kbd, KbdGroup } from "../ui/kbd";

export function Prompt() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    // Listen for AI responses
    window.electronAPI.onAgentStep((step: string) => {
      setSteps(prev => [...prev, step]);
    });

    window.electronAPI.onGenerateComplete((result: any) => {
      setResponse(result.text);
      setLoading(false);
    });

    window.electronAPI.onGenerateError((error: any) => {
      console.error("AI Error:", error);
      setLoading(false);
    });
  }, []);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setSteps([]);
    setResponse("");
    
    window.electronAPI.generateWithMCP(prompt);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">AI Chat</h2>
      
      <div className="space-y-4">
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask me anything..."
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
          />
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Send"}
        </button>
        
        {steps.length > 0 && (
          <div className="bg-gray-50 p-3 rounded">
            <h3 className="font-medium mb-2">AI Steps:</h3>
            {steps.map((step, i) => (
              <div key={i} className="text-sm text-gray-600">{step}</div>
            ))}
          </div>
        )}
        
        {response && (
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-medium mb-2">Response:</h3>
            <div className="whitespace-pre-wrap">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
}
