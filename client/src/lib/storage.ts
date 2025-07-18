import { supabase } from './supabase';

export async function ensureStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const uploadsExists = buckets?.some(bucket => bucket.name === 'uploads');
    
    if (!uploadsExists) {
      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }

      console.log('Storage bucket "uploads" created successfully');
      
      // Set up RLS policies
      await setupStoragePolicies();
    }

    return true;
  } catch (error) {
    console.error('Error ensuring storage bucket:', error);
    return false;
  }
}

async function setupStoragePolicies() {
  try {
    // Note: These policies need to be set up via the Supabase dashboard or SQL editor
    // as the client SDK doesn't have direct access to create RLS policies
    
    const policies = [
      {
        name: 'Allow authenticated uploads',
        sql: `
          CREATE POLICY "Allow authenticated uploads" ON storage.objects
          FOR INSERT TO authenticated
          WITH CHECK (bucket_id = 'uploads');
        `
      },
      {
        name: 'Allow public access',
        sql: `
          CREATE POLICY "Allow public access" ON storage.objects
          FOR SELECT TO public
          USING (bucket_id = 'uploads');
        `
      },
      {
        name: 'Allow users to delete own files',
        sql: `
          CREATE POLICY "Allow users to delete own files" ON storage.objects
          FOR DELETE TO authenticated
          USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
        `
      }
    ];

    console.log('⚠️  Please set up the following RLS policies in your Supabase dashboard:');
    policies.forEach(policy => {
      console.log(`\n${policy.name}:`);
      console.log(policy.sql);
    });

    return true;
  } catch (error) {
    console.error('Error setting up storage policies:', error);
    return false;
  }
} 