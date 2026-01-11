-- Add grading detail columns to comics table
-- These fields store additional data from CGC/CBCS certification lookups

-- Grade date (when the comic was graded by CGC - CBCS doesn't provide this)
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS grade_date TEXT;

-- Grader notes (defects noted by the grader)
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS grader_notes TEXT;

-- Certification number (CGC/CBCS/PGX cert number)
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS certification_number TEXT;

-- Label type (Universal, Signature Series, etc.)
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS label_type TEXT;

-- Page quality (White, Off-white, Cream, etc.)
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS page_quality TEXT;

-- Key info (array of key facts about the issue)
ALTER TABLE comics
ADD COLUMN IF NOT EXISTS key_info JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN comics.grade_date IS 'Date the comic was graded (from CGC cert lookup)';
COMMENT ON COLUMN comics.grader_notes IS 'Defect notes from the grader (CGC: Grader Notes, CBCS: Notes)';
COMMENT ON COLUMN comics.certification_number IS 'CGC/CBCS/PGX certification number';
COMMENT ON COLUMN comics.label_type IS 'Grading label type (Universal, Signature Series, etc.)';
COMMENT ON COLUMN comics.page_quality IS 'Page quality notation (White, Off-white, Cream, etc.)';
COMMENT ON COLUMN comics.key_info IS 'Array of key facts about the issue (first appearances, etc.)';
