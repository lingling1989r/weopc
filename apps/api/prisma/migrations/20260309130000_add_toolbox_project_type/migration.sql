-- Add TOOLBOX to existing ProjectType enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ProjectType' AND e.enumlabel = 'TOOLBOX'
  ) THEN
    ALTER TYPE "ProjectType" ADD VALUE 'TOOLBOX';
  END IF;
END $$;
