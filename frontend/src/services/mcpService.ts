import { McpConfig, McpTool } from '../types';

interface McpToolRequest {
  server: string;
  tool: string;
  arguments: Record<string, any>;
}

interface McpToolResponse {
  result: any;
}

interface McpResourceRequest {
  server: string;
  uri: string;
}

interface McpResourceResponse {
  content: any;
}

// This is a mock service that simulates MCP calls
// In a real application, this would make actual API calls to MCP servers
export const mcpService = {
  // Get available tools from an MCP server
  async getTools(serverUrl: string): Promise<McpTool[]> {
    // Assuming serverUrl is the mcp_config_id
    try {
      const response = await fetch(`/api/v1/mcp_configs/${encodeURIComponent(serverUrl)}/tools`);
      if (!response.ok) {
        throw new Error(`Error fetching tools: ${response.statusText}`);
      }
      const data = await response.json();
      return data as McpTool[];
    } catch (error) {
      console.error('Error in getTools:', error);
      throw error;
    }
  },
  
  // Call an MCP tool
  async callTool(request: McpToolRequest): Promise<McpToolResponse> {
    const { server, tool, arguments: args } = request;
    // Assuming server is the mcp_config_id
    try {
      const response = await fetch(`/api/v1/mcp_configs/${encodeURIComponent(server)}/tools/${encodeURIComponent(tool)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args), // Send arguments in the body
      });
      if (!response.ok) {
        throw new Error(`Error calling tool: ${response.statusText}`);
      }
      const data = await response.json();
      return data as McpToolResponse;
    } catch (error) {
      console.error('Error in callTool:', error);
      throw error;
    }
  },
  
  // Access an MCP resource
  async accessResource(request: McpResourceRequest): Promise<McpResourceResponse> {
    const { server, uri } = request;
    // Assuming server is the mcp_config_id
    try {
      const response = await fetch(`/api/v1/mcp_configs/${encodeURIComponent(server)}/resources/${encodeURIComponent(uri)}`);
      if (!response.ok) {
        throw new Error(`Error accessing resource: ${response.statusText}`);
      }
      const data = await response.json();
      return data as McpResourceResponse;
    } catch (error) {
      console.error('Error in accessResource:', error);
      throw error;
    }
  },
};
