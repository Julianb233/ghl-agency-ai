#!/usr/bin/env tsx

/**
 * Quick test script for Code Generator Service
 * Run with: npx tsx server/services/test-code-generator.ts
 */

import 'dotenv/config';
import { codeGeneratorService } from './code-generator.service';
import type { ProjectContext } from './code-generator.service';

async function testBasicGeneration() {
  console.log('🚀 Testing Code Generator Service\n');

  const context: ProjectContext = {
    projectId: 1,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: [],
  };

  try {
    console.log('Test 1: Generate a simple Button component');
    console.log('━'.repeat(50));

    const result = await codeGeneratorService.generateComponent(
      "Create a simple Button component with primary and secondary variants. Include hover states.",
      context
    );

    console.log('✅ Generation successful!\n');
    console.log('Files generated:', result.files.length);
    console.log('Explanation:', result.explanation);
    console.log('\nGenerated file:');
    console.log('Path:', result.files[0].path);
    console.log('Action:', result.files[0].action);
    console.log('Preview (first 500 chars):');
    console.log(result.files[0].content.substring(0, 500));
    console.log('...\n');

    if (result.dependencies && result.dependencies.length > 0) {
      console.log('Dependencies:', result.dependencies.join(', '));
    }

    console.log('\n✅ All tests passed!');
    console.log('\n📝 Service is ready for use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testBasicGeneration();
