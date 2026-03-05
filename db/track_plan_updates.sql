-- ============================================
-- Add Tracking for Pro Plan Trial & Upgrades
-- ============================================

-- 1. Add columns to track plan updates and trial usage
DO $$ 
BEGIN 
    -- Track when the plan was last updated
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'plan_updated_at') THEN
        ALTER TABLE user_profiles ADD COLUMN plan_updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Track if the current Pro plan is a trial
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'is_trial') THEN
        ALTER TABLE user_profiles ADD COLUMN is_trial BOOLEAN DEFAULT FALSE;
    END IF;

    -- Track if the user has EVER used a trial (to prevent multiple trials)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_profiles' AND COLUMN_NAME = 'has_used_trial') THEN
        ALTER TABLE user_profiles ADD COLUMN has_used_trial BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
