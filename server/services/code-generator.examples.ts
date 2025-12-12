/**
 * Code Generator Service - Practical Examples
 *
 * This file demonstrates real-world usage of the code generator service
 * for the GHL Agency AI platform.
 */

import { codeGeneratorService } from './code-generator.service';
import type { ProjectContext, GeneratedCode } from './code-generator.service';
import fs from 'fs/promises';
import path from 'path';

/**
 * Example 1: Generate a Landing Page Component
 */
export async function generateLandingPage() {
  const context: ProjectContext = {
    projectId: 1,
    techStack: "React 19 + TypeScript + Tailwind CSS + Vite",
    existingFiles: [],
    features: {
      animations: true,
      responsiveDesign: true,
    }
  };

  const prompt = `
Create a modern landing page component with:
- Hero section with gradient background, headline, subheadline, and CTA button
- Features section with 3 feature cards (icon, title, description)
- Pricing section with 3 pricing tiers (Basic, Pro, Enterprise)
- FAQ section with accordion-style questions
- Footer with links and social media icons
- Smooth scroll behavior
- Responsive design for mobile, tablet, and desktop
- Animations on scroll
`;

  const result = await codeGeneratorService.generateComponent(prompt, context);

  console.log('Landing Page Generated:');
  console.log(`Files: ${result.files.length}`);
  console.log(`Dependencies: ${result.dependencies?.join(', ')}`);
  console.log(`Explanation: ${result.explanation}`);

  return result;
}

/**
 * Example 2: Generate Dashboard with Multiple Components
 */
export async function generateDashboard() {
  const context: ProjectContext = {
    projectId: 2,
    techStack: "React 19 + TypeScript + Tailwind CSS + React Router",
    existingFiles: [],
    features: {
      authentication: true,
      charts: true,
      realtime: true,
    }
  };

  const prompt = `
Create a complete analytics dashboard page with:
- Dashboard layout component (header, sidebar, main content)
- Statistics cards showing key metrics (users, revenue, conversion rate, growth)
- Line chart component for tracking metrics over time
- Bar chart for comparing categories
- Recent activity feed
- Quick actions panel
- User profile dropdown in header
- Responsive sidebar that collapses on mobile
- Dark mode support
- Loading skeletons for all data sections
`;

  const result = await codeGeneratorService.generatePage(prompt, context);

  console.log('Dashboard Generated:');
  result.files.forEach(file => {
    console.log(`- ${file.path} (${file.action})`);
  });

  return result;
}

/**
 * Example 3: Generate Authentication Flow
 */
export async function generateAuthFlow() {
  const context: ProjectContext = {
    projectId: 3,
    techStack: "React 19 + TypeScript + Tailwind CSS + React Router",
    existingFiles: [],
    features: {
      authentication: true,
      validation: true,
    }
  };

  const prompt = `
Create a complete authentication flow with:
- Login page with email/password form, remember me, forgot password link
- Registration page with validation (email, password strength, terms agreement)
- Forgot password page with email input
- Reset password page with new password and confirmation
- Auth context provider for managing auth state
- Protected route wrapper component
- Auth hooks (useAuth, useUser)
- Form validation with error messages
- Loading states during API calls
- Social login buttons (Google, GitHub)
- Email verification flow
`;

  const result = await codeGeneratorService.generatePage(prompt, context);

  return result;
}

/**
 * Example 4: Generate Form Components with Validation
 */
export async function generateFormComponents() {
  const context: ProjectContext = {
    projectId: 4,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  const prompt = `
Create reusable form components:
- Input component with label, error message, help text, icons
- TextArea component with character counter
- Select/Dropdown component with search
- Checkbox component with custom styling
- Radio button group component
- Date picker component
- File upload component with drag-and-drop
- Form wrapper component with validation
- Submit button with loading state
All components should support:
- Controlled and uncontrolled modes
- Validation states (valid, invalid, pristine)
- Disabled state
- Required field indicator
- Accessibility attributes
`;

  const result = await codeGeneratorService.generateComponent(prompt, context);

  return result;
}

/**
 * Example 5: Modify Existing Component
 */
export async function enhanceExistingButton() {
  const existingButtonCode = `
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      {children}
    </button>
  );
};
`;

  const context: ProjectContext = {
    projectId: 5,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [
      {
        path: "src/components/Button.tsx",
        content: existingButtonCode,
      }
    ],
  };

  const instruction = `
Enhance the Button component with:
- Variant prop (primary, secondary, danger, ghost, link)
- Size prop (sm, md, lg)
- Icon support (left and right icons)
- Loading state with spinner
- Full width option
- Custom className support
- Proper TypeScript types for all props
- Better accessibility (aria-label, aria-disabled)
`;

  const result = await codeGeneratorService.modifyFile(
    "src/components/Button.tsx",
    instruction,
    context
  );

  return result;
}

/**
 * Example 6: Generate E-commerce Product Page
 */
export async function generateProductPage() {
  const context: ProjectContext = {
    projectId: 6,
    techStack: "React 19 + TypeScript + Tailwind CSS + React Router",
    existingFiles: [],
    features: {
      ecommerce: true,
      reviews: true,
      recommendations: true,
    }
  };

  const prompt = `
Create an e-commerce product page with:
- Product image gallery with thumbnails and zoom
- Product title, price, discount badge
- Product description with expandable sections
- Size/color selector with visual indicators
- Quantity selector
- Add to cart button with animation
- Add to wishlist button
- Product specifications table
- Customer reviews section with ratings, filters, sorting
- Review submission form
- Related products carousel
- Share buttons (social media)
- Breadcrumb navigation
- Mobile-optimized layout
- Stock indicator
- Shipping information
`;

  const result = await codeGeneratorService.generatePage(prompt, context);

  return result;
}

/**
 * Example 7: Generate Data Table Component
 */
export async function generateDataTable() {
  const context: ProjectContext = {
    projectId: 7,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  const prompt = `
Create an advanced data table component with:
- Column configuration (header, accessor, sortable, filterable)
- Sorting (single and multi-column)
- Filtering (text, select, date range)
- Pagination with page size selector
- Row selection (single and multiple)
- Bulk actions toolbar
- Row actions dropdown
- Expandable rows
- Column visibility toggle
- Column resizing
- Export to CSV/Excel
- Search across all columns
- Loading skeleton
- Empty state
- Virtualization for large datasets
- Sticky header
- Responsive mobile view (cards on mobile)
- Custom cell renderers
- TypeScript generics for type safety
`;

  const result = await codeGeneratorService.generateComponent(prompt, context);

  return result;
}

/**
 * Example 8: Generate Full SaaS Application
 */
export async function generateSaaSApplication() {
  const description = `
A complete SaaS application for team collaboration and project management.

Features:
- User authentication and authorization (email/password, OAuth)
- Team/workspace management
- Project creation and management
- Task boards (Kanban-style)
- Task creation, assignment, and tracking
- Comments and mentions
- File attachments
- Real-time updates
- Notifications
- User settings and preferences
- Team member invitation
- Role-based access control
- Activity feed
- Search functionality
- Dark mode
- Mobile responsive

Tech requirements:
- Frontend: React 19, TypeScript, Tailwind CSS, React Router
- State: Context API + useReducer
- Backend: Express.js, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Authentication: JWT tokens
- Real-time: WebSockets
- File storage: AWS S3 or local storage
`;

  const techStack = "React 19 + TypeScript + Tailwind CSS + Express + PostgreSQL + WebSockets";

  const result = await codeGeneratorService.generateFullProject(
    description,
    techStack
  );

  console.log('SaaS Application Generated:');
  console.log(`Total files: ${result.files.length}`);
  console.log(`Dependencies: ${result.dependencies?.length}`);

  return result;
}

/**
 * Example 9: Analyze Existing Project
 */
export async function analyzeExistingProject() {
  // Simulate loading files from a project
  const projectFiles = [
    {
      path: "src/App.tsx",
      content: `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
};`
    },
    {
      path: "src/pages/Dashboard.tsx",
      content: `import React from 'react';
export const Dashboard = () => {
  return <div>Dashboard</div>;
};`
    },
    {
      path: "src/pages/Login.tsx",
      content: `import React, { useState } from 'react';
export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <form>Login Form</form>;
};`
    },
  ];

  const context: ProjectContext = {
    projectId: 8,
    techStack: "React 19 + TypeScript + Tailwind CSS + React Router",
    existingFiles: projectFiles,
  };

  const analysis = await codeGeneratorService.analyzeProject(context);

  console.log('Project Analysis:');
  console.log('Summary:', analysis.summary);
  console.log('Components:', analysis.components);
  console.log('Dependencies:', analysis.dependencies);
  console.log('Suggestions:', analysis.suggestions);

  return analysis;
}

/**
 * Example 10: Streaming Code Generation
 */
export async function generateWithStreaming() {
  const context: ProjectContext = {
    projectId: 9,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  const prompt = `
Create a complex admin dashboard with:
- Multiple chart components
- Data tables
- Statistics cards
- User management interface
- Settings panels
`;

  console.log('Starting streaming code generation...');

  let progress = 0;
  const result = await codeGeneratorService.generateWithStreaming(
    prompt,
    context,
    (chunk) => {
      progress += chunk.length;
      process.stdout.write(`Progress: ${progress} characters\r`);
    }
  );

  console.log('\nStreaming complete!');
  return result;
}

/**
 * Example 11: Write Generated Code to File System
 */
export async function generateAndWriteToFileSystem(
  prompt: string,
  outputDir: string
) {
  const context: ProjectContext = {
    projectId: 10,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  const result = await codeGeneratorService.generateComponent(prompt, context);

  // Write files to disk
  for (const file of result.files) {
    const fullPath = path.join(outputDir, file.path);

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, file.content, 'utf-8');

    console.log(`${file.action}: ${file.path}`);
  }

  // Generate installation script
  if (result.dependencies && result.dependencies.length > 0) {
    const installScript = `#!/bin/bash
# Auto-generated dependency installation script

npm install ${result.dependencies.join(' ')}
`;

    const scriptPath = path.join(outputDir, 'install-deps.sh');
    await fs.writeFile(scriptPath, installScript, 'utf-8');
    await fs.chmod(scriptPath, 0o755);

    console.log(`\nDependency install script created: ${scriptPath}`);
  }

  return result;
}

/**
 * Example 12: Batch Generation
 */
export async function batchGenerateComponents() {
  const context: ProjectContext = {
    projectId: 11,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  const components = [
    "A Modal component with overlay, close button, and customizable content",
    "A Tooltip component with multiple positions and themes",
    "A Badge component with different colors and sizes",
    "A Progress bar component with percentage and variants",
    "An Avatar component with image, initials, and status indicator",
  ];

  const results: GeneratedCode[] = [];

  for (const prompt of components) {
    console.log(`Generating: ${prompt.substring(0, 50)}...`);
    const result = await codeGeneratorService.generateComponent(prompt, context);
    results.push(result);
  }

  console.log(`\nGenerated ${results.length} components`);
  return results;
}

/**
 * Example 13: Iterative Refinement
 */
export async function iterativeRefinement() {
  // First generation
  let context: ProjectContext = {
    projectId: 12,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  console.log('Step 1: Generate initial component');
  const initial = await codeGeneratorService.generateComponent(
    "Create a simple Card component with title and content",
    context
  );

  // Add to context
  context.existingFiles = initial.files.map(f => ({
    path: f.path,
    content: f.content
  }));

  // Second iteration
  console.log('Step 2: Add features');
  const enhanced = await codeGeneratorService.modifyFile(
    initial.files[0].path,
    "Add header, body, footer sections with optional components",
    context
  );

  // Update context
  context.existingFiles = enhanced.files.map(f => ({
    path: f.path,
    content: f.content
  }));

  // Third iteration
  console.log('Step 3: Add interactivity');
  const final = await codeGeneratorService.modifyFile(
    enhanced.files[0].path,
    "Add click handlers, hover effects, and expandable sections",
    context
  );

  console.log('Iterative refinement complete');
  return final;
}

/**
 * Run all examples (for testing)
 */
export async function runAllExamples() {
  console.log('Running all code generator examples...\n');

  try {
    // await generateLandingPage();
    // await generateDashboard();
    // await generateAuthFlow();
    // await generateFormComponents();
    // await enhanceExistingButton();
    // await generateProductPage();
    // await generateDataTable();
    // await generateSaaSApplication();
    await analyzeExistingProject();
    // await generateWithStreaming();
    // await batchGenerateComponents();
    // await iterativeRefinement();

    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    throw error;
  }
}

// Uncomment to run examples
// runAllExamples();
