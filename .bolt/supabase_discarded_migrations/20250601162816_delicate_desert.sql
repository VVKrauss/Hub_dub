/*
  # Create program-images storage bucket

  1. New Storage Bucket
    - Creates a new bucket named 'program-images' for storing event program images
    - Sets up public access for viewing images
    - Configures upload permissions for authenticated users

  2. Security
    - Enables public read access to all files in the bucket
    - Restricts file uploads to authenticated users only
    - Sets file size limit to 5MB
    - Allows only image file types
*/

-- Enable the storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage";

-- Create the program-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('program-images', 'program-images', true);

-- Policy to allow public access to files (read-only)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'program-images');

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'program-images' AND
  octet_length(content) <= 5242880 AND -- 5MB file size limit
  (lower(storage.extension(name)) = ANY (ARRAY['png', 'jpg', 'jpeg', 'gif', 'webp']))
);