/**
 * Browser Services Index
 *
 * Centralized exports for all browser-related services
 */

// Multi-tab management
export {
  multiTabService,
  createMultiTabService,
  type TabGroup,
  type TabContext,
  type TabSwitchStrategy,
  type TabOrchestrationPlan,
  type CrossTabData,
} from './multiTab.service';

// File upload handling
export {
  fileUploadService,
  createFileUploadService,
  type FileInfo,
  type UploadProgress,
  type UploadOptions,
  type UploadResult,
} from './fileUpload.service';

// Visual verification
export {
  visualVerificationService,
  createVisualVerificationService,
  type VerificationResult,
  type VerificationMethod,
  type VerificationConfig,
  type DOMChange,
  type ScreenshotComparison,
} from './visualVerification.service';
