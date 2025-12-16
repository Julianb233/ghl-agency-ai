/**
 * Variable Substitution Utility
 *
 * Provides template-based variable substitution using {{variableName}} syntax.
 * Supports strings, objects, and arrays with recursive substitution.
 *
 * Usage:
 *   import { substituteVariables } from "../_core/variableSubstitution";
 *
 *   // String substitution
 *   substituteVariables("Hello {{name}}", { name: "John" }); // "Hello John"
 *
 *   // Object substitution (recursive)
 *   substituteVariables({ greeting: "Hello {{name}}" }, { name: "John" });
 *   // { greeting: "Hello John" }
 *
 *   // Array substitution
 *   substituteVariables(["Hello {{name}}", "Bye {{name}}"], { name: "John" });
 *   // ["Hello John", "Bye John"]
 *
 *   // Missing variables are preserved
 *   substituteVariables("Hello {{name}}", {}); // "Hello {{name}}"
 */

/**
 * Substitute variables in a value using {{variableName}} syntax.
 *
 * @param value - The value to substitute variables in (string, object, or array)
 * @param variables - The variables to substitute
 * @returns The value with variables substituted
 */
export function substituteVariables(
  value: unknown,
  variables: Record<string, unknown>
): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return value.map((item) => substituteVariables(item, variables));
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = substituteVariables(val, variables);
    }
    return result;
  }

  return value;
}

/**
 * Substitute variables in a string only (type-safe version)
 *
 * @param template - The template string
 * @param variables - The variables to substitute
 * @returns The string with variables substituted
 */
export function substituteStringVariables(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? String(variables[varName]) : match;
  });
}

/**
 * Check if a string contains any variables
 *
 * @param value - The string to check
 * @returns True if the string contains variables
 */
export function hasVariables(value: string): boolean {
  return /\{\{\w+\}\}/.test(value);
}

/**
 * Extract variable names from a template string
 *
 * @param template - The template string
 * @returns Array of variable names found in the template
 */
export function extractVariableNames(template: string): string[] {
  const names: string[] = [];
  const regex = /\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    if (!names.includes(match[1])) {
      names.push(match[1]);
    }
  }
  return names;
}

/**
 * Validate that all required variables are present
 *
 * @param template - The template string
 * @param variables - The available variables
 * @returns Object with validation result and missing variables
 */
export function validateVariables(
  template: string,
  variables: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const required = extractVariableNames(template);
  const missing = required.filter((name) => variables[name] === undefined);
  return { valid: missing.length === 0, missing };
}
