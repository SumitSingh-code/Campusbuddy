-- Add semester column and index to pyq_files table
ALTER TABLE public.pyq_files 
  ADD COLUMN IF NOT EXISTS semester SMALLINT CHECK (semester BETWEEN 1 AND 8);

CREATE INDEX IF NOT EXISTS idx_pyq_dept_sem 
  ON public.pyq_files (department, semester) 
  WHERE status = 'published';
