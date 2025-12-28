/**
 * MCP Prompts Implementation
 * Provides pre-defined prompt templates for common tasks
 *
 * Prompts are templates that can be used to guide AI interactions
 * They can have parameters that get filled in at runtime
 */

import type { MCPContext } from './types';
import { EventEmitter } from 'events';

/**
 * Prompt Argument Definition
 * Describes an input parameter for a prompt
 */
export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

/**
 * Prompt Message
 * A single message in the prompt template
 */
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * MCP Prompt Definition
 * Represents a reusable prompt template
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
  messages: PromptMessage[];
  metadata?: Record<string, unknown>;
}

/**
 * Prompt Get Result
 * The result of retrieving and rendering a prompt
 */
export interface PromptGetResult {
  name: string;
  description?: string;
  messages: PromptMessage[];
}

/**
 * Prompt Registry
 * Manages registration and retrieval of prompt templates
 */
export class PromptRegistry extends EventEmitter {
  private prompts = new Map<string, MCPPrompt>();

  /**
   * Register a new prompt template
   */
  register(prompt: MCPPrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt already registered: ${prompt.name}`);
    }

    // Validate prompt
    this.validatePrompt(prompt);

    this.prompts.set(prompt.name, prompt);
    this.emit('promptRegistered', { name: prompt.name });
  }

  /**
   * Unregister a prompt
   */
  unregister(name: string): void {
    if (!this.prompts.has(name)) {
      throw new Error(`Prompt not found: ${name}`);
    }

    this.prompts.delete(name);
    this.emit('promptUnregistered', { name });
  }

  /**
   * List all registered prompts
   */
  listPrompts(): Array<{ name: string; description?: string; arguments?: PromptArgument[] }> {
    return Array.from(this.prompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    }));
  }

  /**
   * Get a prompt by name
   */
  getPrompt(name: string): MCPPrompt | undefined {
    return this.prompts.get(name);
  }

  /**
   * Get and render a prompt with arguments
   */
  async getPromptWithArguments(
    name: string,
    args: Record<string, string> = {},
    context?: MCPContext
  ): Promise<PromptGetResult> {
    const prompt = this.prompts.get(name);

    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Validate arguments
    this.validateArguments(prompt, args);

    // Render messages with argument substitution
    const renderedMessages = prompt.messages.map(message => ({
      role: message.role,
      content: this.renderTemplate(message.content, args),
    }));

    return {
      name: prompt.name,
      description: prompt.description,
      messages: renderedMessages,
    };
  }

  /**
   * Check if a prompt exists
   */
  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalPrompts: number;
    prompts: string[];
  } {
    return {
      totalPrompts: this.prompts.size,
      prompts: Array.from(this.prompts.keys()),
    };
  }

  /**
   * Validate prompt definition
   */
  private validatePrompt(prompt: MCPPrompt): void {
    if (!prompt.name || typeof prompt.name !== 'string') {
      throw new Error('Prompt name must be a non-empty string');
    }

    if (!prompt.messages || !Array.isArray(prompt.messages) || prompt.messages.length === 0) {
      throw new Error('Prompt must have at least one message');
    }

    for (const message of prompt.messages) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error('Message role must be system, user, or assistant');
      }

      if (!message.content || typeof message.content !== 'string') {
        throw new Error('Message content must be a non-empty string');
      }
    }
  }

  /**
   * Validate arguments against prompt definition
   */
  private validateArguments(prompt: MCPPrompt, args: Record<string, string>): void {
    if (!prompt.arguments) {
      return;
    }

    for (const arg of prompt.arguments) {
      if (arg.required && !args[arg.name] && !arg.default) {
        throw new Error(`Required argument missing: ${arg.name}`);
      }
    }
  }

  /**
   * Render template with argument substitution
   * Supports {{argName}} syntax
   */
  private renderTemplate(template: string, args: Record<string, string>): string {
    let rendered = template;

    // Replace {{argName}} with argument values
    for (const [key, value] of Object.entries(args)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }
}

/**
 * Built-in Prompts
 * Common prompt templates for typical use cases
 */
export function getBuiltInPrompts(): MCPPrompt[] {
  return [
    {
      name: 'code-review',
      description: 'Review code for quality, security, and best practices',
      arguments: [
        {
          name: 'code',
          description: 'The code to review',
          required: true,
        },
        {
          name: 'language',
          description: 'Programming language',
          required: false,
          default: 'typescript',
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer. Analyze code for quality, security, performance, and best practices.',
        },
        {
          role: 'user',
          content: 'Please review the following {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nProvide feedback on:\n1. Code quality and readability\n2. Security concerns\n3. Performance issues\n4. Best practices\n5. Suggestions for improvement',
        },
      ],
    },
    {
      name: 'explain-code',
      description: 'Explain what code does in plain language',
      arguments: [
        {
          name: 'code',
          description: 'The code to explain',
          required: true,
        },
        {
          name: 'language',
          description: 'Programming language',
          required: false,
          default: 'typescript',
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are a helpful programming tutor. Explain code clearly and concisely.',
        },
        {
          role: 'user',
          content: 'Please explain what this {{language}} code does:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. High-level overview\n2. Step-by-step explanation\n3. Any important patterns or techniques used',
        },
      ],
    },
    {
      name: 'debug-help',
      description: 'Help debug an error or issue',
      arguments: [
        {
          name: 'error',
          description: 'The error message or issue',
          required: true,
        },
        {
          name: 'code',
          description: 'Relevant code snippet',
          required: false,
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are an expert debugger. Help identify and fix issues in code.',
        },
        {
          role: 'user',
          content: 'I\'m encountering this error:\n\n{{error}}\n\n{{#if code}}Related code:\n```\n{{code}}\n```{{/if}}\n\nPlease help me:\n1. Understand what\'s causing the error\n2. Suggest how to fix it\n3. Explain how to prevent similar issues',
        },
      ],
    },
    {
      name: 'write-tests',
      description: 'Generate unit tests for code',
      arguments: [
        {
          name: 'code',
          description: 'The code to test',
          required: true,
        },
        {
          name: 'framework',
          description: 'Testing framework',
          required: false,
          default: 'jest',
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are an expert in writing comprehensive unit tests. Generate tests that cover edge cases and follow best practices.',
        },
        {
          role: 'user',
          content: 'Please write unit tests for this code using {{framework}}:\n\n```\n{{code}}\n```\n\nInclude:\n1. Tests for normal cases\n2. Tests for edge cases\n3. Tests for error conditions\n4. Clear test descriptions',
        },
      ],
    },
    {
      name: 'refactor',
      description: 'Suggest refactoring improvements',
      arguments: [
        {
          name: 'code',
          description: 'The code to refactor',
          required: true,
        },
        {
          name: 'goal',
          description: 'Refactoring goal',
          required: false,
          default: 'improve readability and maintainability',
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect. Suggest refactoring improvements while maintaining functionality.',
        },
        {
          role: 'user',
          content: 'Please suggest refactoring improvements for this code to {{goal}}:\n\n```\n{{code}}\n```\n\nProvide:\n1. Specific refactoring suggestions\n2. Improved code examples\n3. Explanation of benefits',
        },
      ],
    },
    {
      name: 'optimize-performance',
      description: 'Suggest performance optimizations',
      arguments: [
        {
          name: 'code',
          description: 'The code to optimize',
          required: true,
        },
        {
          name: 'context',
          description: 'Performance context or constraints',
          required: false,
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are a performance optimization expert. Identify bottlenecks and suggest improvements.',
        },
        {
          role: 'user',
          content: 'Please analyze this code for performance optimizations:\n\n```\n{{code}}\n```\n\n{{#if context}}Context: {{context}}{{/if}}\n\nProvide:\n1. Performance bottlenecks\n2. Optimization suggestions\n3. Expected performance impact',
        },
      ],
    },
    {
      name: 'generate-docs',
      description: 'Generate documentation for code',
      arguments: [
        {
          name: 'code',
          description: 'The code to document',
          required: true,
        },
        {
          name: 'style',
          description: 'Documentation style',
          required: false,
          default: 'JSDoc',
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are a technical documentation expert. Generate clear, comprehensive documentation.',
        },
        {
          role: 'user',
          content: 'Please generate {{style}} documentation for this code:\n\n```\n{{code}}\n```\n\nInclude:\n1. Function/class descriptions\n2. Parameter descriptions\n3. Return value descriptions\n4. Usage examples',
        },
      ],
    },
    {
      name: 'api-design',
      description: 'Design or review an API',
      arguments: [
        {
          name: 'requirements',
          description: 'API requirements or existing design',
          required: true,
        },
        {
          name: 'type',
          description: 'API type (REST, GraphQL, gRPC)',
          required: false,
          default: 'REST',
        },
      ],
      messages: [
        {
          role: 'system',
          content: 'You are an API design expert. Create well-designed, RESTful APIs following best practices.',
        },
        {
          role: 'user',
          content: 'Please help design a {{type}} API based on these requirements:\n\n{{requirements}}\n\nProvide:\n1. Endpoint structure\n2. Request/response formats\n3. Error handling\n4. Best practices applied',
        },
      ],
    },
  ];
}
