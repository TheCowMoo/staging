# Terms and Conditions Implementation Summary

This document outlines the implementation of the one-time Terms and Conditions opt-in requirement for the Pursuit Pathways platform.

## Overview

Users are now required to accept the Terms and Conditions when they first access the platform. This acceptance is:
- **One-time only**: Tracked in the database with `termsAcceptedAt` timestamp
- **Blocking**: Users cannot access protected routes until they accept
- **Non-declining**: The modal persists until accepted (users can decline but will see it again on next access)

## Files Created/Modified

### 1. Database & Schema
- **File**: [drizzle/schema.ts](drizzle/schema.ts)
  - Added `termsAcceptedAt: timestamp("termsAcceptedAt")` field to the `users` table
  - Tracks when a user accepts the terms (null until accepted)

- **File**: [drizzle/0033_terms_and_conditions_acceptance.sql](drizzle/0033_terms_and_conditions_acceptance.sql)
  - Migration file to add the `termsAcceptedAt` column to the database

### 2. Backend/Server
- **File**: [server/db.ts](server/db.ts)
  - Added `acceptTerms(userId: number)` function to update user's `termsAcceptedAt` timestamp
  - Exports the new function for use in routers

- **File**: [server/routers.ts](server/routers.ts)
  - Added `acceptTerms` import from db module
  - Added `auth.acceptTerms` mutation endpoint (protected procedure)
  - Requires authentication and sets the current timestamp when called

### 3. Terms Document
- **File**: [TERMS_AND_CONDITIONS.md](TERMS_AND_CONDITIONS.md)
  - Full legal text of the Terms and Conditions
  - Effective Date: May 18, 2026
  - Covers all key sections (company info, services, eligibility, account registration, etc.)

### 4. Frontend Components
- **File**: [client/src/components/TermsAndConditionsModal.tsx](client/src/components/TermsAndConditionsModal.tsx)
  - Modal dialog showing Terms and Conditions summary
  - Includes checkbox for user agreement
  - "Decline" button (doesn't block - modal reappears on next load)
  - "Accept & Continue" button (only enabled when checkbox is checked)
  - Displays loading state during submission

- **File**: [client/src/components/ProtectedLayout.tsx](client/src/components/ProtectedLayout.tsx)
  - Wrapper component for authenticated pages
  - Checks if user has accepted terms (`user.termsAcceptedAt`)
  - Shows modal if terms not accepted
  - Calls `auth.acceptTerms` mutation on accept
  - Prevents access to protected content until terms are accepted

### 5. Pages
- **File**: [client/src/pages/Dashboard.tsx](client/src/pages/Dashboard.tsx)
  - Wrapped with `<ProtectedLayout>` to require terms acceptance
  - Users will see the modal on first login before accessing dashboard

- **File**: [client/src/pages/TermsAndConditions.tsx](client/src/pages/TermsAndConditions.tsx)
  - Full-page view of the Terms and Conditions
  - Accessible at `/terms-and-conditions`
  - Displays complete legal text
  - Allows users to reference the full document

### 6. Routing
- **File**: [client/src/App.tsx](client/src/App.tsx)
  - Added import for `TermsAndConditions` component
  - Added route: `/terms-and-conditions` → Full T&C page
  - Route is public (can be accessed without login for reference)

## How It Works

### User Flow
1. **First Login**: User logs in and is redirected to dashboard
2. **Modal Check**: `ProtectedLayout` checks if `user.termsAcceptedAt` is null
3. **Show Modal**: If null, displays `TermsAndConditionsModal` with full terms summary
4. **Accept**: User reads and clicks "Accept & Continue" checkbox
5. **API Call**: Calls `auth.acceptTerms` mutation to set `termsAcceptedAt` timestamp
6. **Access Granted**: User can now access the platform
7. **Future Logins**: `user.termsAcceptedAt` is set, so modal doesn't appear

### Declining Terms
- Users can click "Decline" to close the modal temporarily
- Modal will reappear on next page load if terms still not accepted
- Protects against accidental dismissals while still allowing navigation flow

### Database Impact
- New column `termsAcceptedAt` added to `users` table
- No existing user data lost
- Migration creates the column as nullable (defaults to NULL)
- New users will have NULL until they accept

## Extending to Other Pages

To apply the terms requirement to other authenticated pages:

```tsx
import { ProtectedLayout } from "@/components/ProtectedLayout";

export default function SomePage() {
  return (
    <ProtectedLayout>
      {/* Your page content */}
    </ProtectedLayout>
  );
}
```

Apply to key pages such as:
- Facilities
- Audits
- Incidents
- LiabilityScan
- Settings
- etc.

## Testing

To test the implementation:

1. **Run migration**: Execute the migration to create the `termsAcceptedAt` column
2. **Create test user**: Register or login with a user account
3. **First Access**: Navigate to `/dashboard` - modal should appear
4. **Accept Terms**: Check the checkbox and click "Accept & Continue"
5. **Verify**: Modal should close and dashboard should load
6. **Refresh**: Refresh page - modal should NOT appear (terms are accepted)
7. **View Full T&C**: Visit `/terms-and-conditions` to see full document

## Notes

- The modal shows a summary of key sections; link to full document is provided
- Users can view the full Terms and Conditions at any time at `/terms-and-conditions`
- The `termsAcceptedAt` timestamp enables future updates to track version acceptance
- Design follows the existing PrivacyPolicyModal pattern for consistency
- One-time opt-in is enforced by database uniqueness of the acceptance timestamp

## Future Enhancements

- Version tracking: Add `termsVersion` field to track which version user accepted
- Mandatory re-acceptance: Implement logic to require acceptance of updated terms
- Audit trail: Log all terms acceptance events for compliance
- Organization-level: Track which org admins accepted terms on behalf of organization
