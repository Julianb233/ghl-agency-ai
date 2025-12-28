# ExecutionPanel WebSocket Protocol

## Server Endpoint

```
ws://localhost:5174/ws?taskId={taskId}
```

## Message Format

All messages sent from server to client must follow this structure:

```typescript
interface WSMessage {
  type: 'step_update' | 'message' | 'status_change' | 'error';
  taskId: string;
  payload: ExecutionStep | ExecutionMessage | { status: string } | { error: string };
}
```

## Message Types

### 1. Step Update

Updates the status of an execution step. If step with matching `id` exists, it will be updated. Otherwise, a new step will be added.

```json
{
  "type": "step_update",
  "taskId": "task-123",
  "payload": {
    "id": "step-1",
    "label": "Navigate to website",
    "status": "running",
    "startedAt": "2025-12-28T10:30:00Z",
    "details": "Loading https://example.com"
  }
}
```

**Payload Schema:**
```typescript
interface ExecutionStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date | string;
  completedAt?: Date | string;
  details?: string;
  screenshot?: string;
}
```

### 2. Message/Log Entry

Adds a new message to the execution log. Duplicates (same `id`) are automatically filtered.

```json
{
  "type": "message",
  "taskId": "task-123",
  "payload": {
    "id": "msg-456",
    "type": "action",
    "content": "Clicking the login button",
    "timestamp": "2025-12-28T10:30:05Z"
  }
}
```

**Payload Schema:**
```typescript
interface ExecutionMessage {
  id: string;
  type: 'thought' | 'action' | 'observation' | 'error' | 'user';
  content: string;
  timestamp: Date | string;
}
```

**Message Types:**
- `thought`: AI reasoning (purple icon)
- `action`: Action taken (blue arrow icon)
- `observation`: Result observed (green eye icon)
- `error`: Error message (red alert icon)
- `user`: User input (cyan message icon)

### 3. Status Change

Notifies the client of a task status change.

```json
{
  "type": "status_change",
  "taskId": "task-123",
  "payload": {
    "status": "completed"
  }
}
```

**Valid Status Values:**
- `idle`
- `running`
- `paused`
- `completed`
- `failed`

### 4. Error

Sends an error message that will be displayed in the log.

```json
{
  "type": "error",
  "taskId": "task-123",
  "payload": {
    "error": "Failed to connect to browser"
  }
}
```

## Connection Lifecycle

### Client Behavior

1. **Connect**: Client connects when task status changes to `running`
2. **Filter**: Client only processes messages matching its `taskId`
3. **Reconnect**: Client attempts to reconnect up to 5 times with 3-second delays
4. **Disconnect**: Client disconnects when task is no longer `running`

### Server Responsibilities

1. **Accept Connection**: Accept WebSocket connections with `taskId` query parameter
2. **Broadcast**: Send updates for the specific task to all connected clients
3. **Task Filtering**: Optionally filter by `taskId` server-side
4. **Cleanup**: Handle client disconnections gracefully

## Example Server Implementation (Python/FastAPI)

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

class ExecutionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = set()
        self.active_connections[task_id].add(websocket)

    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            self.active_connections[task_id].discard(websocket)

    async def send_step_update(self, task_id: str, step: dict):
        message = {
            "type": "step_update",
            "taskId": task_id,
            "payload": step
        }
        await self._broadcast(task_id, message)

    async def send_message(self, task_id: str, message: dict):
        ws_message = {
            "type": "message",
            "taskId": task_id,
            "payload": message
        }
        await self._broadcast(task_id, ws_message)

    async def send_status_change(self, task_id: str, status: str):
        message = {
            "type": "status_change",
            "taskId": task_id,
            "payload": {"status": status}
        }
        await self._broadcast(task_id, message)

    async def send_error(self, task_id: str, error: str):
        message = {
            "type": "error",
            "taskId": task_id,
            "payload": {"error": error}
        }
        await self._broadcast(task_id, message)

    async def _broadcast(self, task_id: str, message: dict):
        if task_id not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[task_id]:
            try:
                await connection.send_json(message)
            except:
                disconnected.add(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.active_connections[task_id].discard(connection)

execution_manager = ExecutionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, taskId: str):
    await execution_manager.connect(websocket, taskId)
    try:
        while True:
            # Keep connection alive (client doesn't send messages)
            await websocket.receive_text()
    except WebSocketDisconnect:
        execution_manager.disconnect(websocket, taskId)
```

## Example Usage from Server

```python
# When starting a step
await execution_manager.send_step_update("task-123", {
    "id": "step-1",
    "label": "Navigate to website",
    "status": "running",
    "startedAt": datetime.utcnow().isoformat()
})

# When completing a step
await execution_manager.send_step_update("task-123", {
    "id": "step-1",
    "label": "Navigate to website",
    "status": "completed",
    "completedAt": datetime.utcnow().isoformat()
})

# Sending a log message
await execution_manager.send_message("task-123", {
    "id": f"msg-{uuid4()}",
    "type": "action",
    "content": "Clicking the submit button",
    "timestamp": datetime.utcnow().isoformat()
})

# Changing task status
await execution_manager.send_status_change("task-123", "completed")

# Sending an error
await execution_manager.send_error("task-123", "Browser crashed")
```

## Testing with `wscat`

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:5174/ws?taskId=test-123"

# Send test messages
{"type":"step_update","taskId":"test-123","payload":{"id":"step-1","label":"Test Step","status":"running"}}
{"type":"message","taskId":"test-123","payload":{"id":"msg-1","type":"action","content":"Test message","timestamp":"2025-12-28T10:00:00Z"}}
{"type":"status_change","taskId":"test-123","payload":{"status":"completed"}}
```

## Environment Configuration

Client expects WebSocket URL from environment variable:

```bash
# .env.local
VITE_WS_URL=ws://localhost:5174/ws
```

If not set, defaults to `ws://localhost:5174/ws`
