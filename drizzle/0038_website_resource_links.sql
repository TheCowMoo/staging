-- Migration 0038: Website Resource Links for EAP
-- Stores regulatory reference URLs per-organization for AI context injection.
-- These links are scoped to the organization and only visible to the AI
-- when generating an Emergency Action Plan for a facility in that org.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS website_resource_links TEXT DEFAULT ('[]');