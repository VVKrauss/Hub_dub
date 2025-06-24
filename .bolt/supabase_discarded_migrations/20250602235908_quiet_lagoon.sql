/*
  # Rename festival_programm column to festival_program
  
  1. Changes
    - Rename column from festival_programm to festival_program
    - Update column comment to reflect new name
    
  2. Purpose
    - Fix typo in column name
    - Maintain consistency with frontend code
*/

ALTER TABLE events 
RENAME COLUMN festival_programm TO festival_program;

COMMENT ON COLUMN events.festival_program IS 'Stores the structure and details of festival programs';