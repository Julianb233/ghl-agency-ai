/**
 * Browser Automation Enhancement Examples
 *
 * This file demonstrates how to use the new browser automation features
 * including multi-tab support, file handling, action verification, and DOM inspection.
 */

import { stagehandService } from '../server/services/stagehand.service';

// ========================================
// Example 1: Multi-Tab Workflow
// ========================================

async function multiTabExample(sessionId: string) {
  console.log('=== Multi-Tab Example ===');

  // Open a new tab in the background
  const tab1 = await stagehandService.openTab(
    sessionId,
    'https://www.google.com',
    true // Open in background
  );
  console.log('Opened background tab:', tab1.tabId);

  // Open another tab and switch to it
  const tab2 = await stagehandService.openTab(
    sessionId,
    'https://www.github.com',
    false // Switch to this tab
  );
  console.log('Opened and switched to tab:', tab2.tabId);

  // List all tabs
  const tabList = await stagehandService.listTabs(sessionId);
  console.log('All tabs:', tabList.tabs);

  // Switch between tabs
  await stagehandService.switchTab(sessionId, tab1.tabId!);
  console.log('Switched back to Google tab');

  // Close a tab
  await stagehandService.closeTab(sessionId, tab1.tabId!);
  console.log('Closed Google tab');
}

// ========================================
// Example 2: File Upload Workflow
// ========================================

async function fileUploadExample(sessionId: string) {
  console.log('=== File Upload Example ===');

  // Navigate to a form
  await stagehandService.navigate(sessionId, 'https://example.com/upload-form');

  // Inspect the page to find file input
  const structure = await stagehandService.getPageStructure(sessionId);
  const fileInput = structure.structure?.inputs.find(
    input => input.type === 'file'
  );

  if (fileInput) {
    console.log('Found file input:', fileInput.selector);

    // Upload a file
    const uploadResult = await stagehandService.uploadFile(
      sessionId,
      fileInput.selector,
      '/path/to/document.pdf'
    );

    console.log('File uploaded:', uploadResult.filename);

    // Get list of downloads (if any files were downloaded)
    const downloads = await stagehandService.getDownloads(sessionId);
    console.log('Downloads:', downloads.downloads);
  }
}

// ========================================
// Example 3: Action Verification Workflow
// ========================================

async function actionVerificationExample(sessionId: string) {
  console.log('=== Action Verification Example ===');

  // Navigate to a login page
  await stagehandService.navigate(sessionId, 'https://example.com/login');

  // Before clicking the login button, verify it's ready
  const preVerification = await stagehandService.verifyActionPreconditions(
    sessionId,
    'button[type="submit"]',
    'click'
  );

  console.log('Pre-action verification:', preVerification);

  if (preVerification.canProceed) {
    console.log('Login button is ready to click');

    // Fill in credentials (example)
    await stagehandService.act(sessionId, 'type "user@example.com" into the email field');
    await stagehandService.act(sessionId, 'type "password123" into the password field');

    // Click login
    await stagehandService.act(sessionId, 'click the login button');

    // Wait a moment for navigation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the login was successful
    const postVerification = await stagehandService.verifyActionSuccess(
      sessionId,
      'click',
      {
        urlPattern: '.*/dashboard.*', // Should navigate to dashboard
        elementSelector: '.user-profile', // Profile element should appear
      }
    );

    console.log('Post-action verification:', postVerification);

    if (postVerification.success) {
      console.log('Login successful!');
      console.log('Changes detected:', postVerification.changes);
    } else {
      console.log('Login failed!');
      console.log('Issues:', postVerification.issues);
    }
  } else {
    console.log('Login button is not ready:');
    console.log('Issues:', preVerification.issues);
  }
}

// ========================================
// Example 4: DOM Inspection Workflow
// ========================================

async function domInspectionExample(sessionId: string) {
  console.log('=== DOM Inspection Example ===');

  // Navigate to a page
  await stagehandService.navigate(sessionId, 'https://example.com');

  // Get the overall page structure
  const structure = await stagehandService.getPageStructure(sessionId);
  console.log('Page Structure:');
  console.log('- Forms:', structure.structure?.forms.length);
  console.log('- Links:', structure.structure?.links.length);
  console.log('- Buttons:', structure.structure?.buttons.length);
  console.log('- Inputs:', structure.structure?.inputs.length);

  // Inspect a specific element
  if (structure.structure?.buttons.length) {
    const firstButton = structure.structure.buttons[0];
    console.log('Inspecting first button:', firstButton.selector);

    const inspection = await stagehandService.inspectElement(
      sessionId,
      firstButton.selector
    );

    if (inspection.success && inspection.element) {
      console.log('Button details:');
      console.log('- Tag:', inspection.element.tagName);
      console.log('- Text:', inspection.element.text);
      console.log('- Visible:', inspection.element.isVisible);
      console.log('- Enabled:', inspection.element.isEnabled);
      console.log('- Attributes:', inspection.element.attributes);
      console.log('- Position:', inspection.element.boundingBox);
    }
  }
}

// ========================================
// Example 5: Complete E2E Workflow
// ========================================

async function completeWorkflowExample(sessionId: string) {
  console.log('=== Complete E2E Workflow ===');

  // Step 1: Open main application in primary tab
  await stagehandService.navigate(sessionId, 'https://app.example.com/login');

  // Step 2: Verify we can login
  const loginVerification = await stagehandService.verifyActionPreconditions(
    sessionId,
    'button#login-submit',
    'click'
  );

  if (!loginVerification.canProceed) {
    console.error('Cannot proceed with login:', loginVerification.issues);
    return;
  }

  // Step 3: Perform login
  await stagehandService.act(sessionId, 'type "user@example.com" into email field');
  await stagehandService.act(sessionId, 'type "password" into password field');
  await stagehandService.act(sessionId, 'click the login button');

  // Step 4: Wait and verify login success
  await new Promise(resolve => setTimeout(resolve, 2000));
  const loginSuccess = await stagehandService.verifyActionSuccess(
    sessionId,
    'click',
    { urlPattern: '.*/dashboard.*' }
  );

  if (!loginSuccess.success) {
    console.error('Login failed:', loginSuccess.issues);
    return;
  }

  console.log('Successfully logged in!');

  // Step 5: Open a new tab for documentation
  const docsTab = await stagehandService.openTab(
    sessionId,
    'https://docs.example.com',
    true // Open in background
  );

  // Step 6: Navigate to upload form in main tab
  await stagehandService.act(sessionId, 'navigate to the upload section');

  // Step 7: Get page structure to find file input
  const structure = await stagehandService.getPageStructure(sessionId);
  const fileInput = structure.structure?.inputs.find(i => i.type === 'file');

  if (fileInput) {
    // Step 8: Upload file
    await stagehandService.uploadFile(
      sessionId,
      fileInput.selector,
      '/tmp/report.pdf'
    );

    // Step 9: Submit the form
    await stagehandService.act(sessionId, 'click the submit button');

    // Step 10: Verify submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    const submitSuccess = await stagehandService.verifyActionSuccess(
      sessionId,
      'click',
      {
        elementSelector: '.success-message',
        urlPattern: '.*/success.*'
      }
    );

    if (submitSuccess.success) {
      console.log('File uploaded successfully!');
      console.log('Changes:', submitSuccess.changes);
    }
  }

  // Step 11: Switch to docs tab to verify something
  await stagehandService.switchTab(sessionId, docsTab.tabId!);
  console.log('Switched to documentation tab');

  // Step 12: Inspect an element in docs
  const element = await stagehandService.inspectElement(
    sessionId,
    'h1'
  );
  console.log('Documentation title:', element.element?.text);

  // Step 13: Close docs tab
  await stagehandService.closeTab(sessionId, docsTab.tabId!);
  console.log('Closed documentation tab');

  // Step 14: List remaining tabs
  const finalTabs = await stagehandService.listTabs(sessionId);
  console.log('Remaining tabs:', finalTabs.tabs?.length);

  console.log('=== Workflow Complete ===');
}

// ========================================
// Example 6: Error Handling and Recovery
// ========================================

async function errorHandlingExample(sessionId: string) {
  console.log('=== Error Handling Example ===');

  try {
    // Attempt to click a button
    const verification = await stagehandService.verifyActionPreconditions(
      sessionId,
      'button#submit',
      'click'
    );

    if (!verification.canProceed) {
      // Element is not ready, handle issues
      console.log('Action cannot proceed. Issues found:');
      verification.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });

      // Check specific issues
      if (verification.elementInfo) {
        if (!verification.elementInfo.exists) {
          console.log('Recovery: Element does not exist, waiting...');
          await stagehandService.waitFor(sessionId, 'selector', 'button#submit');
        } else if (!verification.elementInfo.visible) {
          console.log('Recovery: Element is hidden, scrolling to it...');
          await stagehandService.act(sessionId, 'scroll to the submit button');
        } else if (!verification.elementInfo.enabled) {
          console.log('Recovery: Element is disabled, checking form validity...');
          // Fill required fields, etc.
        }
      }

      // Retry verification
      const retryVerification = await stagehandService.verifyActionPreconditions(
        sessionId,
        'button#submit',
        'click'
      );

      if (retryVerification.canProceed) {
        console.log('Recovery successful, proceeding with action');
        await stagehandService.act(sessionId, 'click the submit button');
      } else {
        console.log('Recovery failed, cannot proceed');
      }
    } else {
      // Action is safe to proceed
      await stagehandService.act(sessionId, 'click the submit button');
      console.log('Action executed successfully');
    }
  } catch (error) {
    console.error('Error during automation:', error);
    // Handle error appropriately
  }
}

// ========================================
// Usage
// ========================================

export async function runAllExamples() {
  // Create a session
  const session = await stagehandService.createSession({
    model: 'anthropic',
    verbose: 1,
  });

  const sessionId = session.id;

  try {
    // Run individual examples
    await multiTabExample(sessionId);
    await fileUploadExample(sessionId);
    await actionVerificationExample(sessionId);
    await domInspectionExample(sessionId);
    await errorHandlingExample(sessionId);

    // Or run the complete workflow
    // await completeWorkflowExample(sessionId);

  } finally {
    // Always close the session when done
    await stagehandService.closeSession(sessionId);
    console.log('Session closed');
  }
}

// Export individual examples for selective usage
export {
  multiTabExample,
  fileUploadExample,
  actionVerificationExample,
  domInspectionExample,
  completeWorkflowExample,
  errorHandlingExample,
};
