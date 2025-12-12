import Anthropic from "@anthropic-ai/sdk";

export interface GeneratedCode {
  files: Array<{
    path: string;
    content: string;
    action: 'create' | 'update' | 'delete';
  }>;
  explanation: string;
  dependencies?: string[];
}

export interface ProjectContext {
  projectId: number;
  techStack: string;
  existingFiles: Array<{ path: string; content: string }>;
  features?: Record<string, boolean>;
}

export interface CodeRequest {
  prompt: string;
  targetFile?: string;
  context: ProjectContext;
}

export interface ProjectAnalysis {
  summary: string;
  components: string[];
  dependencies: string[];
  suggestions: string[];
}

class CodeGeneratorService {
  private claude: Anthropic;
  private model = "claude-3-opus-20240229";

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.claude = new Anthropic({ apiKey });
  }

  /**
   * Generate a React component based on prompt and context
   */
  async generateComponent(
    prompt: string,
    context: ProjectContext
  ): Promise<GeneratedCode> {
    const systemPrompt = this.buildSystemPrompt(context);
    const codePrompt = `Generate a React component with the following requirements:

${prompt}

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "file content here",
      "action": "create"
    }
  ],
  "explanation": "Brief explanation of what was generated",
  "dependencies": ["package-name@version"]
}

Do not include markdown code blocks, explanatory text, or anything outside the JSON object.`;

    const request: CodeRequest = {
      prompt: codePrompt,
      context,
    };

    return this.executeCodeGeneration(systemPrompt, request);
  }

  /**
   * Generate a complete page with routing, components, and logic
   */
  async generatePage(
    prompt: string,
    context: ProjectContext
  ): Promise<GeneratedCode> {
    const systemPrompt = this.buildSystemPrompt(context);
    const codePrompt = `Generate a complete React page with all necessary components, routing, and state management:

${prompt}

Requirements:
- Main page component
- Any child components needed
- React Router integration if needed
- State management (useState/useContext as appropriate)
- TypeScript types
- Error boundaries
- Loading states

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "file content here",
      "action": "create"
    }
  ],
  "explanation": "Brief explanation of what was generated",
  "dependencies": ["package-name@version"]
}

Do not include markdown code blocks, explanatory text, or anything outside the JSON object.`;

    const request: CodeRequest = {
      prompt: codePrompt,
      context,
    };

    return this.executeCodeGeneration(systemPrompt, request);
  }

  /**
   * Modify an existing file based on instructions
   */
  async modifyFile(
    filePath: string,
    instruction: string,
    context: ProjectContext
  ): Promise<GeneratedCode> {
    const existingFile = context.existingFiles.find(
      (f) => f.path === filePath
    );
    if (!existingFile) {
      throw new Error(`File not found: ${filePath}`);
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const codePrompt = `Modify the following file according to the instructions:

File: ${filePath}
Current Content:
\`\`\`
${existingFile.content}
\`\`\`

Instructions: ${instruction}

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "files": [
    {
      "path": "${filePath}",
      "content": "updated file content here",
      "action": "update"
    }
  ],
  "explanation": "Brief explanation of the changes made",
  "dependencies": ["package-name@version"]
}

Do not include markdown code blocks, explanatory text, or anything outside the JSON object.`;

    const request: CodeRequest = {
      prompt: codePrompt,
      targetFile: filePath,
      context,
    };

    return this.executeCodeGeneration(systemPrompt, request);
  }

  /**
   * Generate a complete full-stack project structure
   */
  async generateFullProject(
    description: string,
    techStack: string
  ): Promise<GeneratedCode> {
    const context: ProjectContext = {
      projectId: 0,
      techStack,
      existingFiles: [],
    };

    const systemPrompt = this.buildSystemPrompt(context);
    const codePrompt = `Generate a complete full-stack project structure:

Description: ${description}
Tech Stack: ${techStack}

Include:
- Project structure (folders and files)
- Configuration files (package.json, tsconfig.json, vite.config.ts, etc.)
- Main application files
- API routes/endpoints
- Database schema/models
- Authentication setup
- Basic components
- README with setup instructions

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "file content here",
      "action": "create"
    }
  ],
  "explanation": "Brief explanation of the project structure",
  "dependencies": ["package-name@version"]
}

Do not include markdown code blocks, explanatory text, or anything outside the JSON object.`;

    const request: CodeRequest = {
      prompt: codePrompt,
      context,
    };

    return this.executeCodeGeneration(systemPrompt, request);
  }

  /**
   * Analyze an existing project and provide insights
   */
  async analyzeProject(context: ProjectContext): Promise<ProjectAnalysis> {
    const systemPrompt = this.buildSystemPrompt(context);
    const analysisPrompt = `Analyze the following project and provide insights:

Tech Stack: ${context.techStack}
Existing Files: ${context.existingFiles.length}

Files:
${context.existingFiles.map((f) => `- ${f.path}`).join("\n")}

Provide:
1. A summary of the project structure and purpose
2. List of React components found
3. List of dependencies used
4. Suggestions for improvements, best practices, or missing features

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "summary": "Project summary here",
  "components": ["Component1", "Component2"],
  "dependencies": ["react", "typescript"],
  "suggestions": ["Add error boundaries", "Implement unit tests"]
}

Do not include markdown code blocks, explanatory text, or anything outside the JSON object.`;

    try {
      const message = await this.claude.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Expected text response from Claude");
      }

      return this.parseAnalysisResponse(content.text);
    } catch (error) {
      console.error("Project analysis error:", error);
      throw new Error(
        `Failed to analyze project: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Build the system prompt with project context
   */
  private buildSystemPrompt(context: ProjectContext): string {
    return `You are an expert React developer specializing in modern TypeScript applications.

Project Context:
- Tech Stack: ${context.techStack}
- Existing Files: ${context.existingFiles.length}
${context.features ? `- Features: ${JSON.stringify(context.features)}` : ""}

Code Generation Rules:
1. Use React 19 with functional components and hooks
2. Use TypeScript with strict type checking
3. Use Tailwind CSS for styling
4. Follow existing project patterns and conventions
5. Export components as named exports (not default exports)
6. Include proper error handling and loading states
7. Use modern ES6+ syntax
8. Implement proper TypeScript interfaces and types
9. Follow accessibility best practices
10. Write clean, maintainable, and well-documented code

Component Structure:
- Import statements first
- Type definitions
- Component implementation
- Export statement

Styling Guidelines:
- Use Tailwind utility classes
- Responsive design (mobile-first)
- Consistent spacing and layout
- Proper color contrast for accessibility

State Management:
- Use useState for local state
- Use useContext for shared state
- Implement proper prop drilling prevention
- Handle async operations with proper loading states

Error Handling:
- Implement try-catch blocks
- Provide user-friendly error messages
- Include error boundaries where appropriate
- Log errors for debugging

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanatory text.
The JSON must match the exact structure specified in the user's prompt.`;
  }

  /**
   * Build a focused code generation prompt
   */
  private buildCodePrompt(request: CodeRequest): string {
    const { prompt, targetFile, context } = request;

    let codePrompt = prompt;

    if (context.existingFiles.length > 0) {
      codePrompt += `\n\nExisting Project Files:\n`;
      context.existingFiles.forEach((file) => {
        codePrompt += `\n${file.path}:\n\`\`\`\n${file.content.substring(0, 500)}...\n\`\`\`\n`;
      });
    }

    if (targetFile) {
      codePrompt += `\n\nTarget File: ${targetFile}`;
    }

    return codePrompt;
  }

  /**
   * Execute code generation with Claude API
   */
  private async executeCodeGeneration(
    systemPrompt: string,
    request: CodeRequest
  ): Promise<GeneratedCode> {
    const userPrompt = this.buildCodePrompt(request);

    try {
      const message = await this.claude.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Expected text response from Claude");
      }

      return this.parseGeneratedCode(content.text);
    } catch (error) {
      console.error("Code generation error:", error);
      throw new Error(
        `Failed to generate code: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Parse and validate the generated code response
   */
  private parseGeneratedCode(response: string): GeneratedCode {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/, "").replace(/\n?```$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error("Invalid response: missing or invalid 'files' array");
      }

      if (!parsed.explanation || typeof parsed.explanation !== "string") {
        throw new Error(
          "Invalid response: missing or invalid 'explanation' string"
        );
      }

      // Validate each file entry
      for (const file of parsed.files) {
        if (!file.path || typeof file.path !== "string") {
          throw new Error("Invalid file entry: missing or invalid 'path'");
        }
        if (!file.content || typeof file.content !== "string") {
          throw new Error("Invalid file entry: missing or invalid 'content'");
        }
        if (!["create", "update", "delete"].includes(file.action)) {
          throw new Error(
            "Invalid file entry: action must be 'create', 'update', or 'delete'"
          );
        }
      }

      return {
        files: parsed.files,
        explanation: parsed.explanation,
        dependencies: parsed.dependencies || [],
      };
    } catch (error) {
      console.error("Failed to parse generated code:", error);
      console.error("Raw response:", response);
      throw new Error(
        `Failed to parse generated code: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Parse and validate the project analysis response
   */
  private parseAnalysisResponse(response: string): ProjectAnalysis {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/, "").replace(/\n?```$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.summary || typeof parsed.summary !== "string") {
        throw new Error("Invalid response: missing or invalid 'summary'");
      }

      if (!Array.isArray(parsed.components)) {
        throw new Error(
          "Invalid response: missing or invalid 'components' array"
        );
      }

      if (!Array.isArray(parsed.dependencies)) {
        throw new Error(
          "Invalid response: missing or invalid 'dependencies' array"
        );
      }

      if (!Array.isArray(parsed.suggestions)) {
        throw new Error(
          "Invalid response: missing or invalid 'suggestions' array"
        );
      }

      return {
        summary: parsed.summary,
        components: parsed.components,
        dependencies: parsed.dependencies,
        suggestions: parsed.suggestions,
      };
    } catch (error) {
      console.error("Failed to parse analysis response:", error);
      console.error("Raw response:", response);
      throw new Error(
        `Failed to parse analysis response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validate that generated TypeScript code is syntactically correct
   */
  private async validateTypeScript(code: string): Promise<boolean> {
    // Basic validation - check for common syntax errors
    const syntaxChecks = [
      // Check for balanced braces
      (code.match(/{/g) || []).length === (code.match(/}/g) || []).length,
      // Check for balanced parentheses
      (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length,
      // Check for balanced brackets
      (code.match(/\[/g) || []).length === (code.match(/]/g) || []).length,
      // Check for import statements
      code.includes("import "),
      // Check for export statement
      code.includes("export "),
    ];

    return syntaxChecks.every((check) => check);
  }

  /**
   * Extract dependencies that need to be installed
   */
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    const importRegex = /import .+ from ['"](.+)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      // Only add external packages (not relative imports)
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
        // Remove scope and get package name
        const packageName = importPath.startsWith("@")
          ? importPath.split("/").slice(0, 2).join("/")
          : importPath.split("/")[0];

        if (!dependencies.includes(packageName)) {
          dependencies.push(packageName);
        }
      }
    }

    return dependencies;
  }

  /**
   * Generate code with streaming for large responses
   */
  async generateWithStreaming(
    prompt: string,
    context: ProjectContext,
    onChunk: (chunk: string) => void
  ): Promise<GeneratedCode> {
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      let fullResponse = "";

      const stream = await this.claude.messages.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: true,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const chunk = event.delta.text;
          fullResponse += chunk;
          onChunk(chunk);
        }
      }

      return this.parseGeneratedCode(fullResponse);
    } catch (error) {
      console.error("Streaming code generation error:", error);
      throw new Error(
        `Failed to generate code with streaming: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// Export singleton instance
export const codeGeneratorService = new CodeGeneratorService();
