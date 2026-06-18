# Connecting the PKB server to Claude

The server speaks MCP over stdio. Use the absolute path to wherever you unzipped this project.

## Claude Desktop

Edit the config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server:

```json
{
  "mcpServers": {
    "venueos-pkb": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/pkb/mcp-server/src/index.js"]
    }
  }
}
```

Restart Claude Desktop. The three tools (search_pkb, get_document, list_sources) appear in the tools menu. Try asking: "Using the PKB, why was Smart Hold built and what is still missing for GTM?"

## Claude Code

```bash
claude mcp add venueos-pkb -- node /ABSOLUTE/PATH/TO/pkb/mcp-server/src/index.js
```

Then in a session: "Search the PKB for how hold conflicts handle turnover time, and cite sources."

## Notes

- Run `npm install` in `mcp-server/` first.
- The index is built once at startup. Restart the server to pick up content changes.
- Point the server at a different content root with the `PKB_ROOT` environment variable.
