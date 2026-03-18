-- Run this in Supabase Dashboard > SQL Editor
-- These indexes dramatically speed up user_answers queries (prevents full table scans)

CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question_id ON user_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_question ON user_answers(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_created ON user_answers(user_id, created_at DESC);
