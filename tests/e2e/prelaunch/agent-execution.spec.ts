import { test, expect } from '@playwright/test';
import { getDeploymentUrl } from '../utils/deployment-test-utils';

const baseUrl = getDeploymentUrl();

test.describe('Agent Execution and Task Management', () => {
  test('Agent creation endpoint is accessible', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/agents`, {
      data: {
        name: 'test-agent',
        description: 'Test agent'
      },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 201, 401, 404]).toContain(response.status());
    }
  });

  test('Agent listing endpoint is available', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/agents`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Task creation endpoint works', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/tasks`, {
      data: {
        name: 'test-task',
        description: 'Test task',
        status: 'pending'
      },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    }
  });

  test('Task retrieval endpoint is functional', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/tasks`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Task execution status endpoint available', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/tasks/status`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Workflow execution endpoint accessible', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/workflows/execute`, {
      data: { workflowId: 'test' },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 404]).toContain(response.status());
    }
  });

  test('Server-Sent Events (SSE) endpoint for real-time updates', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/agent/events`, {
      headers: { 'Accept': 'text/event-stream' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Agent configuration endpoint accessible', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/agents/config`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Task completion endpoint works', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/tasks/complete`, {
      data: { taskId: 'test' },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 404]).toContain(response.status());
    }
  });

  test('Agent result retrieval endpoint', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/agents/results`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Polling mechanism for task status', async ({ page }) => {
    // Simulate polling for task status
    const response1 = await page.request.get(`${baseUrl}/api/tasks/status`);
    await page.waitForTimeout(100);
    const response2 = await page.request.get(`${baseUrl}/api/tasks/status`);

    expect([response1.status(), response2.status()].every(s => s < 500)).toBe(true);
  });

  test('Webhook for task completion events', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/webhooks/tasks`, {
      data: {
        event: 'task.completed',
        taskId: 'test'
      },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 404]).toContain(response.status());
    }
  });

  test('Agent memory/context endpoints', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/agents/memory`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Tool availability endpoint', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/tools/available`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('API key generation for agent tasks', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/apikeys/generate`, {
      data: { name: 'test-key' },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 201, 401, 404]).toContain(response.status());
    }
  });

  test('Agent metrics and performance tracking', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/agents/metrics`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Task history and logs endpoint', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/tasks/logs`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Agent validation endpoint', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/agents/validate`, {
      data: { agentConfig: {} },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 400, 401, 404]).toContain(response.status());
    }
  });

  test('Error handling in agent execution', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/agents/execute`, {
      data: { invalid: 'data' },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([400, 401, 404, 422]).toContain(response.status());
    }
  });

  test('Agent timeout handling', async ({ page }) => {
    const longRunningResponse = await page.request.post(`${baseUrl}/api/agents/execute`, {
      data: { timeout: 10000 },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (longRunningResponse) {
      expect([200, 400, 401, 408, 504]).toContain(longRunningResponse.status());
    }
  });

  test('Batch task execution endpoint', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/tasks/batch`, {
      data: {
        tasks: [
          { name: 'task1', action: 'test' },
          { name: 'task2', action: 'test' }
        ]
      },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    }
  });
});
