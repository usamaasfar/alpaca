import React, { useState, useEffect } from 'react';

interface MCP {
  name: string;
  url: string;
}

export function MCPConnections() {
  const [availableMCPs, setAvailableMCPs] = useState<MCP[]>([]);
  const [connectedMCPs, setConnectedMCPs] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [pendingOAuth, setPendingOAuth] = useState<string | null>(null);

  useEffect(() => {
    loadMCPs();
    
    // Listen for OAuth callbacks
    window.electronAPI.onOAuthCallback(async (code: string) => {
      if (pendingOAuth) {
        console.log(`🔗 Completing OAuth for ${pendingOAuth} with code:`, code.substring(0, 10) + '...');
        
        try {
          const result = await window.electronAPI.finishOAuth(pendingOAuth, code);
          if (result.success) {
            console.log(`✅ ${pendingOAuth} OAuth completed!`, result.tools);
            setPendingOAuth(null);
            await loadMCPs();
          }
        } catch (error) {
          console.error(`OAuth completion failed:`, error);
          setPendingOAuth(null);
        }
      }
    });
  }, [pendingOAuth]);

  const loadMCPs = async () => {
    try {
      const available = await window.electronAPI.getAvailableMCPs();
      const connected = await window.electronAPI.getConnectedMCPs();
      setAvailableMCPs(available);
      setConnectedMCPs(connected);
    } catch (error) {
      console.error('Failed to load MCPs:', error);
    }
  };

  const handleConnect = async (mcpName: string) => {
    setConnecting(mcpName);
    try {
      const result = await window.electronAPI.connectMCP(mcpName);
      
      if (result.success) {
        console.log(`✅ ${mcpName} connected!`, result.tools);
        await loadMCPs();
      } else if (result.needsAuth) {
        console.log(`🔐 ${mcpName} needs OAuth - opening browser...`);
        setPendingOAuth(mcpName);
        // OAuth URL will open automatically, callback will be handled by onOAuthCallback
      }
    } catch (error) {
      console.error(`Failed to connect to ${mcpName}:`, error);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">MCP Connections</h2>
      
      <div className="space-y-2">
        {availableMCPs.map((mcp) => {
          const isConnected = connectedMCPs.includes(mcp.name);
          const isConnecting = connecting === mcp.name;
          
          return (
            <div key={mcp.name} className="flex items-center justify-between p-3 border rounded">
              <div>
                <span className="font-medium">{mcp.name}</span>
                {isConnected && <span className="ml-2 text-green-600">✅ Connected</span>}
              </div>
              
              <button
                onClick={() => handleConnect(mcp.name)}
                disabled={isConnected || isConnecting}
                className={`px-3 py-1 rounded text-sm ${
                  isConnected 
                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                    : isConnecting
                    ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
      
      {connectedMCPs.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded">
          <p className="text-green-800">
            🎉 You have {connectedMCPs.length} MCP(s) connected! 
            You can now use them in AI conversations.
          </p>
        </div>
      )}
    </div>
  );
}
