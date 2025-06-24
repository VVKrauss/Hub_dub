-- Create the program-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('program-images', 'program-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to files (read-only)
CREATE POLICY "Public Access to Program Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'program-images');

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated Users Can Upload Program Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'program-images' AND
  octet_length(content) <= 5242880 AND -- 5MB file size limit
  (lower(storage.extension(name)) = ANY (ARRAY['png', 'jpg', 'jpeg', 'gif', 'webp']))
);

-- Policy to allow authenticated users to update files
CREATE POLICY "Authenticated Users Can Update Program Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'program-images')
WITH CHECK (
  bucket_id = 'program-images' AND
  octet_length(content) <= 5242880 AND
  (lower(storage.extension(name)) = ANY (ARRAY['png', 'jpg', 'jpeg', 'gif', 'webp']))
);

-- Policy to allow authenticated users to delete files
CREATE POLICY "Authenticated Users Can Delete Program Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'program-images');