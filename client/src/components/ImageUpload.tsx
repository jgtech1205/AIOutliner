import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Generate preview when file is selected
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG/PNG images are supported');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setProcessedImage(null);
  };

  // Process image through backend
  const handleUpload = async () => {
    if (!selectedFile || !session) {
      toast.error(selectedFile ? 'Please sign in' : 'Select an image first');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Processing image...', { id: 'upload' });

      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      // 3. Send to processing API
      const response = await fetch('https://image-processor-rc.onrender.com/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ image_url: publicUrl })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      // 4. Handle response
      const { base64_image } = await response.json();
      setProcessedImage(base64_image);
      toast.success('Image processed!', { id: 'upload' });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed', { id: 'upload' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center mb-4">
            <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 ml-3">
              Image Processor
            </h1>
          </div>
          <p className="text-gray-600 text-center">
            Upload an image to apply edge detection and grayscale effects
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Image Panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Original</h2>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center h-full">
              {preview ? (
                <div className="flex flex-col h-full">
                  <div className="flex-grow flex items-center justify-center">
                    <img
                      src={preview}
                      alt="Original preview"
                      className="max-h-64 max-w-full rounded-md object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview(null);
                      setProcessedImage(null);
                    }}
                    className="mt-4 flex items-center justify-center text-sm text-red-600 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-3">
                  <div className="p-4 rounded-full bg-gray-100">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <label className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500">
                      Select an image
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg, image/png"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      JPG or PNG, max 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Processed Image Panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Processed</h2>
            <div className="border-2 border-gray-200 rounded-lg p-6 text-center h-full flex flex-col">
              {processedImage ? (
                <div className="flex-grow flex items-center justify-center">
                  <img
                    src={processedImage}
                    alt="Processed result"
                    className="max-h-64 max-w-full rounded-md object-contain"
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  {preview ? 'Processed image will appear here' : 'Upload an image to begin'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              !selectedFile || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } flex items-center justify-center`}
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Process Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}