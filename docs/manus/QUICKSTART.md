# Quick Start Guide

Get the Manus-style Claude AI agent running in 5 minutes.

## Prerequisites

- Python 3.11+
- Docker Desktop (for sandbox execution)
- Claude API key from [Anthropic](https://console.anthropic.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Julianb233/claude-agent-platform.git
cd claude-agent-platform
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

```bash
# Create .env file
cp .env.example .env

# Edit .env and add your Claude API key
nano .env  # or use your preferred editor
```

Add your API key:
```env
CLAUDE_API_KEY=sk-ant-api03-...
```

### 4. Start Docker

Make sure Docker Desktop is running. The agent uses Docker containers for sandbox execution.

```bash
# Test Docker is working
docker ps
```

## Running the Agent

### Basic Usage

```bash
python agent_implementation.py
```

This will run the default task (Fibonacci calculator).

### Custom Tasks

Edit `agent_implementation.py` and modify the task:

```python
# In the main() function, change the task:
task = "Your custom task here"
result = agent.run(task)
```

Or use it programmatically:

```python
from agent_implementation import ManusAgent
import os

# Initialize agent
agent = ManusAgent(api_key=os.getenv("CLAUDE_API_KEY"))

# Run a task
result = agent.run("Create a Python script that sorts a list of numbers")

print(result)
```

## Example Tasks

Try these tasks to test the agent:

### 1. Simple Code Generation
```python
agent.run("Create a Python function that checks if a number is prime")
```

### 2. File Operations
```python
agent.run("Create a markdown file explaining binary search with examples")
```

### 3. Data Processing
```python
agent.run("Write a Python script that reads a CSV file and calculates statistics")
```

### 4. Multi-Step Task
```python
agent.run("Create a simple calculator program with add, subtract, multiply, and divide functions, then test it")
```

## Understanding the Output

The agent will show:
- **Iteration number**: Current loop iteration
- **Tool name**: Which tool is being used
- **Tool input**: Parameters passed to the tool
- **Tool result**: Output from the tool execution
- **Final result**: The completed task output

Example output:
```
============================================================
Iteration 1
============================================================

Stop Reason: tool_use

Tool: plan
Input: {
  "action": "update",
  "goal": "Create a Python script that calculates Fibonacci numbers",
  "current_phase_id": 1,
  "phases": [...]
}

Result: {"status": "success", "message": "Task plan updated"}

============================================================
Iteration 2
============================================================
...
```

## Troubleshooting

### Docker Connection Error

**Error**: `Cannot connect to the Docker daemon`

**Solution**: 
- Make sure Docker Desktop is running
- On Linux, add your user to the docker group: `sudo usermod -aG docker $USER`

### API Key Error

**Error**: `Authentication error`

**Solution**:
- Verify your API key is correct in `.env`
- Check you have credits in your Anthropic account

### Module Not Found

**Error**: `ModuleNotFoundError: No module named 'anthropic'`

**Solution**:
```bash
pip install -r requirements.txt
```

### Timeout Errors

**Error**: `Command timed out`

**Solution**:
- Increase timeout in `.env`: `SANDBOX_TIMEOUT=600`
- Or pass timeout parameter in tool call

## Advanced Configuration

### Increase Memory Limit

Edit `.env`:
```env
SANDBOX_MEMORY_LIMIT=1g
```

### Change Claude Model

Edit `.env`:
```env
CLAUDE_MODEL=claude-3-opus-20240229
```

Available models:
- `claude-3-5-sonnet-20241022` (recommended, best balance)
- `claude-3-opus-20240229` (most capable, slower)
- `claude-3-haiku-20240307` (fastest, cheaper)

### Enable Debug Logging

Edit `agent_implementation.py`:
```python
# Add at the top
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Next Steps

1. **Read the full documentation**: See `MANUS_SYSTEM_PROMPT.md` for complete details
2. **Add more tools**: Extend the tool framework with custom tools
3. **Build a web interface**: Create a frontend for the agent
4. **Deploy to production**: Use Docker Compose for deployment

## Example: Building a Complete Application

```python
from agent_implementation import ManusAgent
import os

agent = ManusAgent(api_key=os.getenv("CLAUDE_API_KEY"))

# Multi-phase task
task = """
Create a complete TODO list application:
1. Create a Python script with functions to add, remove, list, and mark tasks as complete
2. Save tasks to a JSON file for persistence
3. Add a command-line interface
4. Test all functions
5. Create documentation
"""

result = agent.run(task, max_iterations=100)
print(result)
```

## Getting Help

- **Documentation**: Read `MANUS_SYSTEM_PROMPT.md`
- **Issues**: Open a GitHub issue
- **Examples**: Check the `examples/` directory (coming soon)

## Tips for Best Results

1. **Be specific**: Clear instructions get better results
2. **Break down complex tasks**: The agent will create a plan automatically
3. **Provide context**: Include relevant details and constraints
4. **Iterate**: If the result isn't perfect, ask for refinements
5. **Check outputs**: Always verify generated code and content

## What's Next?

- Add web browser automation tool
- Add search integration
- Add database tools
- Create REST API wrapper
- Build React frontend
- Add authentication
- Deploy to cloud

Happy building! 🚀
