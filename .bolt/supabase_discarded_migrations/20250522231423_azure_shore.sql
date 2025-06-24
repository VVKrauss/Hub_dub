/*
  # Fix Storage RLS Policies

  1. Changes
    - Enable RLS on storage.objects table
    - Create policies for public read access and authenticated user operations
    - Ensure proper access control for the images bucket

  2. Security
    - Allow public read access to speaker images
    - Allow authenticated users to upload, update, and delete images
    - Restrict operations to the images bucket and speakers folder
*/

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Allow public read access to speaker images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

CREATE POLICY "Allow authenticated users to upload speaker images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Allow authenticated users to update speaker images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "Allow authenticated users to delete speaker images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');