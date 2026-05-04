-- Migration to add 'tour' to the package_type enum
-- This is necessary because the packages table still uses the legacy package_type enum
-- and tries to keep it in sync with the dynamic package_types table.

ALTER TYPE public.package_type ADD VALUE IF NOT EXISTS 'tour';
