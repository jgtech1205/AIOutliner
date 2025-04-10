/*
  # Add storage bucket policies

  1. Storage Policies
    - Create storage bucket for images if it doesn't exist
    - Enable RLS on the bucket
    - Add policies for authenticated users to:
      - Upload images
      - Read their own images
      - Delete their own images

  2. Security
    - Ensure only authenticated users can upload images
    - Users can only access their own images
    - Users can only delete their own images
*/

-- Create bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name)
  VALUES ('images', 'images')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload files to the images bucket
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  owner = auth.uid()
);

-- Allow users to read their own images
CREATE POLICY "Allow users to read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  owner = auth.uid()
);

-- Allow users to update their own images
CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' AND
  owner = auth.uid()
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  owner = auth.uid()
);