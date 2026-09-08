# Summary
This extension exposes a Model Context Protocol (MCP) server over the Picteus API.

When activated, the extensions starts a Server-Sent Events (SSE) MCP server, listening to incoming requests.

# Settings
- The `Port number` indicates the port number that should be used by the MCP server. The MCP server is consequently accessible via `http://localhost:<portNumber>/sse`.
- The `API Key` specifies the Picteus API key that the MCP server should use to communicate with the Picteus back-end server, in case Picteus was started with the API key restriction.
