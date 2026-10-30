# PlayVear Labs - Agent Standing Instructions & Rules

## 1. Automatic Screenshot & Attachment Cleanup Rule (CRITICAL)
- Whenever the user uploads or sends a screenshot or image attachment (whether in `/public/assets/aistudio/Screenshot_*` or in `.tempmediaStorage/media_*`):
  1. Inspect and process the screenshot to address the user's issue or request.
  2. **AUTOMATIC CLEANUP:** Immediately after completing the task associated with the screenshot, automatically delete all screenshot and media files:
     - `/public/assets/aistudio/Screenshot_*`
     - `/.aistudio/artifacts/brain/b026bd1e-839f-47ac-adb7-87b7cfb1efa2/.tempmediaStorage/*`
     without needing any explicit prompt or reminder from the user.
  3. Keep the app size minimal and clean at all times for quick zip downloads.

## 2. Core App Configuration
- **App Name:** PlayVear Labs
- **Navigation:**
  - Tab 1: Step 1 Generate Voice
  - Tab 2: Step 2 Generate Video
- **Firebase Auth:** Shared Google User Auth synced across Step 1 and Step 2 (`ai-studio-b026bd1e-839f-47ac-adb7-87b7cfb1efa2`).
