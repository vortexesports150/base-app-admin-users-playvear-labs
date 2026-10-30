# PlayVear Labs - Agent Standing Instructions & Rules

## 1. Automatic Screenshot & Attachment Cleanup Rule (CRITICAL)
- Whenever the user uploads or sends a screenshot or image attachment (e.g. into `/public/assets/aistudio/Screenshot_*.jpg` or anywhere in the workspace):
  1. Inspect and process the screenshot to address the user's issue or request.
  2. **AUTOMATIC CLEANUP:** Immediately after completing the task associated with the screenshot, automatically delete all screenshot files (`/public/assets/aistudio/Screenshot_*`) from the workspace without needing any explicit prompt or reminder from the user.
  3. Keep the app size minimal and clean at all times for quick zip downloads.

## 2. Core App Configuration
- **App Name:** PlayVear Labs
- **Navigation:**
  - Tab 1: Step 1 Voice Generator
  - Tab 2: Step 2 Video Generator
- **Firebase Auth:** Shared Google User Auth synced across Step 1 and Step 2 (`ai-studio-b026bd1e-839f-47ac-adb7-87b7cfb1efa2`).
