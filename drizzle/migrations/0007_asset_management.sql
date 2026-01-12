-- Asset Management Migration
-- Creates tables for storing client assets and media files

-- Asset folders table (supports nested folder structure)
CREATE TABLE IF NOT EXISTS asset_folders (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "clientProfileId" INTEGER REFERENCES client_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "parentId" INTEGER REFERENCES asset_folders(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for asset_folders
CREATE INDEX IF NOT EXISTS asset_folders_user_id_idx ON asset_folders("userId");
CREATE INDEX IF NOT EXISTS asset_folders_client_profile_id_idx ON asset_folders("clientProfileId");
CREATE INDEX IF NOT EXISTS asset_folders_parent_id_idx ON asset_folders("parentId");

-- Client assets table
CREATE TABLE IF NOT EXISTS client_assets (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "clientProfileId" INTEGER REFERENCES client_profiles(id) ON DELETE CASCADE,
    "folderId" INTEGER REFERENCES asset_folders(id) ON DELETE SET NULL,
    
    -- File information
    filename TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    
    -- Storage locations
    "s3Key" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "cdnUrl" TEXT,
    
    -- Categorization
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata (dimensions, duration, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Access control
    "isPublic" BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for client_assets
CREATE INDEX IF NOT EXISTS client_assets_user_id_idx ON client_assets("userId");
CREATE INDEX IF NOT EXISTS client_assets_client_profile_id_idx ON client_assets("clientProfileId");
CREATE INDEX IF NOT EXISTS client_assets_category_idx ON client_assets(category);
CREATE INDEX IF NOT EXISTS client_assets_folder_id_idx ON client_assets("folderId");
CREATE INDEX IF NOT EXISTS client_assets_tags_idx ON client_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS client_assets_created_at_idx ON client_assets("createdAt");

-- Add constraint for category values
ALTER TABLE client_assets ADD CONSTRAINT client_assets_category_check 
    CHECK (category IN ('logo', 'image', 'video', 'document', 'audio', 'other'));
