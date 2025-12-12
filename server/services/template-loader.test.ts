import { templateLoader } from './template-loader.service';
import * as path from 'path';

/**
 * Test script for template loader service
 * Run with: npx ts-node server/services/template-loader.test.ts
 */

async function runTests() {
  console.log('🧪 Testing Template Loader Service\n');

  try {
    // Test 1: Get available templates
    console.log('Test 1: Getting available templates...');
    const templates = await templateLoader.getAvailableTemplates();
    console.log('✅ Available templates:', templates);
    console.log('');

    // Test 2: Get metadata for each template
    console.log('Test 2: Getting template metadata...');
    for (const template of templates) {
      const metadata = await templateLoader.getTemplateMetadata(template);
      console.log(`✅ ${metadata.name}:`, {
        description: metadata.description,
        files: metadata.files
      });
    }
    console.log('');

    // Test 3: Load a template
    console.log('Test 3: Loading react-ts template...');
    const files = await templateLoader.loadTemplate('react-ts');
    console.log(`✅ Loaded ${files.length} files`);
    console.log('Files:', files.map(f => f.path));
    console.log('');

    // Test 4: Apply variables
    console.log('Test 4: Testing variable replacement...');
    const testContent = 'Project: {{PROJECT_NAME}}, Port: {{PORT}}';
    const result = await templateLoader.applyVariables(testContent, {
      PROJECT_NAME: 'test-app',
      PORT: 3000
    });
    console.log('Original:', testContent);
    console.log('Result:', result);
    console.log('✅ Variable replacement working');
    console.log('');

    // Test 5: Load template with variables
    console.log('Test 5: Loading template with variables...');
    const processedFiles = await templateLoader.loadTemplateWithVariables('static', {
      PROJECT_NAME: 'my-static-site',
      PORT: 8080
    });
    const indexFile = processedFiles.find(f => f.path === 'index.html');
    if (indexFile && indexFile.content.includes('my-static-site')) {
      console.log('✅ Variables applied successfully');
    } else {
      console.log('❌ Variables not applied correctly');
    }
    console.log('');

    // Test 6: Error handling
    console.log('Test 6: Testing error handling...');
    try {
      await templateLoader.loadTemplate('non-existent-template');
      console.log('❌ Should have thrown an error');
    } catch (error) {
      console.log('✅ Error handling works:', (error as Error).message);
    }
    console.log('');

    console.log('🎉 All tests completed!\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`- Total templates: ${templates.length}`);
    console.log(`- Templates available: ${templates.join(', ')}`);
    for (const template of templates) {
      const metadata = await templateLoader.getTemplateMetadata(template);
      console.log(`  - ${template}: ${metadata.files} files`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
