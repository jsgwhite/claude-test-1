# Mem MCP Integration

## Overview

This project integrates with the **Model Context Protocol (MCP)** via the **mem** server, which provides advanced memory and context management capabilities for AI agents and development workflows.

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard for structuring and exchanging conversational context, memory, tool calls, and interaction data between AI systems and clients. It enables:

- **Flexible memory management** – Long-term, shared, and external memory access
- **Advanced workflows** – Tool use, agent chains, and multi-turn reasoning
- **Plug-and-play integration** – Works with different AI models and services
- **Context preservation** – Maintains conversation state across sessions

## The Mem Server

The mem MCP server (`https://mcp.mem.ai/mcp`) provides:

- **Episodic Memory** – Store and retrieve facts, decisions, and context from conversations
- **Structured Context** – Organize memories hierarchically for better reasoning
- **External Memory Integration** – Connect to memory backends and knowledge bases
- **Agent Coordination** – Enable multiple AI agents to share context and collaborate

This is particularly useful for:
- Development tasks requiring cross-session context
- Complex workflows where memory of previous steps is critical
- AI-assisted coding where understanding project history improves suggestions
- Collaborative development where agent actions need to be tracked and referenced

## Configuration

The mem MCP server is configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "mem": {
      "type": "http",
      "url": "https://mcp.mem.ai/mcp"
    }
  }
}
```

## Local Development Setup

### Prerequisites

- Node.js 16+
- npm or pnpm
- Docker (optional, for containerized development)

### Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure local Claude settings:**
   - Edit `.claude/settings.local.json` to add permissions for the tools you need
   - The mem MCP server is already configured and accessible via the HTTP endpoint

3. **Launch development servers:**
   - Use the VS Code debug configurations in `.claude/launch.json`
   - Or run manually:
     ```bash
     npm run dev:api    # API server on port 3001
     npm run dev:web    # Web frontend on port 5173
     ```

### Accessing Memory Context

When working with Claude or AI assistants in this repo:
- The mem MCP connection allows the assistant to store and retrieve project context
- Development decisions and architecture notes are persisted
- Future sessions can reference this shared memory

## Use Cases in This Project

### 1. Project Architecture & History
Store architectural decisions, design patterns, and project history for reference across development sessions.

### 2. Development Workflow
Track build configurations, deployment settings, and development notes to improve consistency.

### 3. Bug Tracking & Learning
Document bugs encountered, solutions discovered, and lessons learned for future reference.

### 4. Agent Coordination
If using multiple AI agents or assistants, the shared memory enables better collaboration and context awareness.

## Resources

- [MemGPT Documentation](https://docs.memgpt.ai/overview/mcp) – Comprehensive MCP specification and concepts
- [mem.ai](https://mem.ai/) – Memory infrastructure for AI systems
- [Model Context Protocol](https://modelcontextprotocol.io/) – Official MCP specification

## Notes

- The mem MCP server is HTTP-based and requires internet connectivity
- Memory stored on the server is associated with your mem.ai account
- Local development settings in `.claude/settings.local.json` contain machine-specific paths and should be customized per developer environment
- The MCP protocol is under active development; check the official resources for the latest features and best practices

## Future Enhancements

- [ ] Add local memory caching for offline development
- [ ] Integrate mem MCP with GitHub issue tracking
- [ ] Create memory templates for common development scenarios
- [ ] Document team memory standards and practices
