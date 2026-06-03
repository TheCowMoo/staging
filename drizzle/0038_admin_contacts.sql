-- Migration 0038: Administration Section
-- Adds columns for Administration panel (policies, coordinator contacts,
-- emergency contacts migration, website resource links)

-- 1. Add new administration columns to facilities table
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS operational_policies TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS coordinator_contacts TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS admin_emergency_contacts TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS website_resource_links TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS photo_document_assets TEXT DEFAULT '[]';

-- 2. Migrate existing emergency_contacts data to new admin_emergency_contacts column
-- This safely copies the old emergency_contacts into the new admin-only storage
UPDATE facilities
SET admin_emergency_contacts = emergency_contacts
WHERE emergency_contacts IS NOT NULL AND emergency_contacts != '[]';

-- 3. Note: The original emergency_contacts column is kept for backward compatibility
-- but will be deprecated in favor of admin_emergency_contacts in the UI layer.