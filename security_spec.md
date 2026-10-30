# Security Specification - Payment & Credit System

## Data Invariants
1. A user can only see their own `payment_requests`.
2. Only admins can update the status of a `payment_request` or modify `settings/payment`.
3. Users cannot modify their own `credits` field directly.
4. `payment_requests` must have a valid `userId` matching the requester.
5. `transactionId` must be a non-empty string.

## The "Dirty Dozen" Payloads (Red Team)
1. **Unauthorized Setting Update**: Try to change bKash number as a normal user.
2. **Self-Approval**: Try to set a `payment_request` status to 'completed' as a normal user.
3. **Credit Injection**: Try to update own `credits` field in `users` collection.
4. **Transaction ID Poisoning**: Submit a 1MB string as a `transactionId`.
5. **Identity Spoofing**: Submit a `payment_request` for another user's `userId`.
6. **Admin Impersonation**: Try to read all `payment_requests` as a non-admin.
7. **Status Jumping**: Change status from 'rejected' back to 'pending'.
8. **PII Leak**: Read another user's `email` from their profile.
9. **Orphaned Request**: Create a `payment_request` with a non-existent `userId`.
10. **Immutable Field Change**: Try to change `createdAt` of a request.
11. **Negative Credits**: Try to set `credits` to -100.
12. **Method Spoofing**: Use an invalid payment method like "paypal".

## Rules Design
- `isAdmin()` helper based on email: `request.auth.token.email == 'vortexesports150@gmail.com' && request.auth.token.email_verified == true`.
- `isValidUser(data)`
- `isValidPaymentRequest(data)`
- `isValidPaymentSettings(data)`

Final `firestore.rules` will be generated after this spec is reviewed.
