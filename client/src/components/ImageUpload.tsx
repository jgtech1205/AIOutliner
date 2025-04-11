import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Check for session on component mount and listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Session updated:', session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle file selection and preview generation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type: only JPEG or PNG allowed
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Please select a JPG or PNG image');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setProcessedImage(null);
  };

  // Handle image upload and processing
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    if (!session) {
      toast.error('Please sign in to upload images');
      return;
    }

    try {
      setLoading(true);

      // STEP 1: Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      console.log('Uploading file to path:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        toast.error('Image upload failed.');
        throw uploadError;
      }

      // STEP 2: Retrieve the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      console.log('Public image URL:', publicUrl);

      // STEP 3: Call the Edge Function to process the image
      // Update this URL if needed for your deployment.
      const functionUrl = 'https://image-processor-rro0.onrender.com';
      console.log('Calling edge function:', functionUrl);

      const edgeResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Uncomment the line below if your edge function requires an Authorization header:
          // 'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ image_path: publicUrl })
      });

      if (!edgeResponse.ok) {
        const errorData = await edgeResponse.json().catch(() => ({}));
        console.error('Edge function error response:', errorData);
        throw new Error(`Failed to process image: ${edgeResponse.status} ${edgeResponse.statusText}`);
      }

      // STEP 4: Parse the response from the edge function
      const result = await edgeResponse.json();
      console.log('Edge function response:', result);

      if (!result.processed_image_url) {
        throw new Error('No processed image URL returned from edge function');
      }

      // STEP 5: Set the processed image URL to display in the UI
      setProcessedImage(result.processed_image_url);
      toast.success('Image processed successfully!');
    } catch (error: any) {
      console.error('Error in handleUpload:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process image');

      // Optional: Cleanup the uploaded file if processing failed
      if (selectedFile) {
        const cleanupFileName = `${Math.random()}.${selectedFile.name.split('.').pop()}`;
        await supabase.storage
          .from('images')
          .remove([cleanupFileName])
          .catch(console.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center mb-8">
          <ImageIcon className="w-10 h-10 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900 ml-3">Upload Image</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Original Image Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-700">Original Image</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview(null);
                      setProcessedImage(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <div className="text-gray-600">
                    <label className="cursor-pointer hover:text-indigo-600">
                      <span className="text-indigo-600">Click to upload</span>
                      <span className="text-gray-500"> or drag and drop</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">JPG or PNG only</p>
                </div>
              )}
            </div>
          </div>

          {/* Processed Image Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-700">Processed Image</h2>
            <div className="border-2 border-gray-300 rounded-lg p-8 text-center">
              {processedImage ? (
                <img
                  src={processedImage}
                  alt="Processed"
                  className="max-h-64 mx-auto rounded-lg"
                />
              ) : (
                <div className="text-gray-500">Processed image will appear here</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Process Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageUpload;
