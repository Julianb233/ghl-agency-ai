import { describe, it, expect, beforeEach, vi } from "vitest";
import { codeGeneratorService } from "./code-generator.service";
import type { ProjectContext } from "./code-generator.service";

describe("CodeGeneratorService", () => {
  let mockContext: ProjectContext;

  beforeEach(() => {
    mockContext = {
      projectId: 1,
      techStack: "React 19 + TypeScript + Tailwind CSS + Vite",
      existingFiles: [],
      features: {
        authentication: true,
        database: true,
      },
    };
  });

  describe("generateComponent", () => {
    it("should generate a simple button component", async () => {
      const prompt =
        "Create a reusable Button component with primary and secondary variants, different sizes, and disabled state. Include hover and focus styles.";

      const result = await codeGeneratorService.generateComponent(
        prompt,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.files).toBeInstanceOf(Array);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.explanation).toBeTruthy();

      const buttonFile = result.files[0];
      expect(buttonFile.path).toContain("Button");
      expect(buttonFile.content).toContain("interface");
      expect(buttonFile.content).toContain("export");
      expect(buttonFile.action).toBe("create");
    });

    it("should generate a form component with validation", async () => {
      const prompt =
        "Create a contact form component with name, email, and message fields. Include form validation, error messages, and submit handling.";

      const result = await codeGeneratorService.generateComponent(
        prompt,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.files.length).toBeGreaterThan(0);

      const formFile = result.files[0];
      expect(formFile.content).toContain("useState");
      expect(formFile.content).toContain("onSubmit");
    });

    it("should generate a data table component", async () => {
      const prompt =
        "Create a data table component with sorting, filtering, and pagination. Support for custom column definitions and row actions.";

      const result = await codeGeneratorService.generateComponent(
        prompt,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.dependencies).toBeDefined();
    });
  });

  describe("generatePage", () => {
    it("should generate a dashboard page", async () => {
      const prompt =
        "Create a dashboard page with a header, sidebar navigation, statistics cards, and a chart section. Include responsive layout.";

      const result = await codeGeneratorService.generatePage(
        prompt,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.files.length).toBeGreaterThan(1); // Should have multiple files
      expect(result.explanation).toBeTruthy();
    });

    it("should generate an authentication page", async () => {
      const prompt =
        "Create a login page with email/password form, 'Remember me' checkbox, forgot password link, and social login buttons.";

      const result = await codeGeneratorService.generatePage(
        prompt,
        mockContext
      );

      expect(result).toBeDefined();
      const hasAuthLogic = result.files.some((f) =>
        f.content.includes("useState")
      );
      expect(hasAuthLogic).toBe(true);
    });
  });

  describe("modifyFile", () => {
    it("should modify an existing component", async () => {
      const existingCode = `
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  );
};
`;

      const contextWithFile: ProjectContext = {
        ...mockContext,
        existingFiles: [
          {
            path: "src/components/Button.tsx",
            content: existingCode,
          },
        ],
      };

      const result = await codeGeneratorService.modifyFile(
        "src/components/Button.tsx",
        "Add a 'variant' prop that supports 'primary', 'secondary', and 'danger' styles",
        contextWithFile
      );

      expect(result).toBeDefined();
      expect(result.files[0].action).toBe("update");
      expect(result.files[0].content).toContain("variant");
    });

    it("should throw error for non-existent file", async () => {
      await expect(
        codeGeneratorService.modifyFile(
          "non-existent.tsx",
          "Add something",
          mockContext
        )
      ).rejects.toThrow("File not found");
    });
  });

  describe("generateFullProject", () => {
    it("should generate a complete project structure", async () => {
      const description =
        "A simple task management app with user authentication, task CRUD operations, and filtering";
      const techStack = "React 19 + TypeScript + Tailwind CSS + Express + PostgreSQL";

      const result = await codeGeneratorService.generateFullProject(
        description,
        techStack
      );

      expect(result).toBeDefined();
      expect(result.files.length).toBeGreaterThan(5);

      const hasPackageJson = result.files.some((f) =>
        f.path.includes("package.json")
      );
      const hasTsConfig = result.files.some((f) =>
        f.path.includes("tsconfig.json")
      );

      expect(hasPackageJson || hasTsConfig).toBe(true);
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies!.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeProject", () => {
    it("should analyze a project with existing files", async () => {
      const contextWithFiles: ProjectContext = {
        ...mockContext,
        existingFiles: [
          {
            path: "src/components/Header.tsx",
            content: "export const Header = () => <header>App</header>;",
          },
          {
            path: "src/pages/Dashboard.tsx",
            content: "export const Dashboard = () => <div>Dashboard</div>;",
          },
          {
            path: "src/App.tsx",
            content: "import React from 'react'; export const App = () => <div />;",
          },
        ],
      };

      const result = await codeGeneratorService.analyzeProject(
        contextWithFiles
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeTruthy();
      expect(result.components).toBeInstanceOf(Array);
      expect(result.dependencies).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty context gracefully", async () => {
      const emptyContext: ProjectContext = {
        projectId: 0,
        techStack: "",
        existingFiles: [],
      };

      const result = await codeGeneratorService.generateComponent(
        "Create a simple div",
        emptyContext
      );

      expect(result).toBeDefined();
    });

    it("should handle very long prompts", async () => {
      const longPrompt = `
        Create a comprehensive dashboard component that includes:
        ${Array(100).fill("- Feature item").join("\n")}
      `;

      const result = await codeGeneratorService.generateComponent(
        longPrompt,
        mockContext
      );

      expect(result).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should validate generated TypeScript syntax", async () => {
      const result = await codeGeneratorService.generateComponent(
        "Create a simple Card component",
        mockContext
      );

      const code = result.files[0].content;

      // Check balanced braces
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);

      // Check for imports and exports
      expect(code).toMatch(/import .+ from/);
      expect(code).toMatch(/export/);
    });

    it("should extract dependencies correctly", async () => {
      const result = await codeGeneratorService.generateComponent(
        "Create a form using react-hook-form and zod for validation",
        mockContext
      );

      expect(result.dependencies).toBeDefined();
      // Should detect react-hook-form and zod if used
    });
  });

  describe("Streaming", () => {
    it("should generate code with streaming", async () => {
      const chunks: string[] = [];

      const result = await codeGeneratorService.generateWithStreaming(
        "Create a simple Navbar component",
        mockContext,
        (chunk) => {
          chunks.push(chunk);
        }
      );

      expect(result).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join("")).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      // This would require mocking the Anthropic API to throw an error
      // For now, we just ensure the error is properly typed
      try {
        await codeGeneratorService.generateComponent("Invalid request", {
          projectId: -1,
          techStack: "",
          existingFiles: [],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should handle malformed JSON responses", () => {
      // Test the parseGeneratedCode method with invalid JSON
      const service = codeGeneratorService as any;

      expect(() => {
        service.parseGeneratedCode("Not valid JSON");
      }).toThrow();

      expect(() => {
        service.parseGeneratedCode('{"files": "not an array"}');
      }).toThrow();
    });
  });

  describe("Real-World Scenarios", () => {
    it("should generate a complete authentication flow", async () => {
      const result = await codeGeneratorService.generatePage(
        `Create a complete authentication flow with:
        - Login page with email/password
        - Registration page with validation
        - Password reset page
        - Protected route wrapper component
        - Auth context provider
        Use React Router for navigation and localStorage for token storage`,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.files.length).toBeGreaterThan(3);
    });

    it("should generate a CRUD interface", async () => {
      const result = await codeGeneratorService.generatePage(
        `Create a CRUD interface for managing blog posts with:
        - List view with pagination
        - Create form with rich text editor
        - Edit form (reuse create form)
        - Delete confirmation modal
        - API integration hooks
        - Loading and error states`,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.files.length).toBeGreaterThan(4);
    });

    it("should generate responsive layouts", async () => {
      const result = await codeGeneratorService.generateComponent(
        `Create a responsive grid layout component that:
        - Shows 1 column on mobile
        - Shows 2 columns on tablet
        - Shows 3 columns on desktop
        - Shows 4 columns on large screens
        - Has configurable gap sizes
        - Supports different alignment options`,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.files[0].content).toMatch(/grid/i);
    });
  });
});
