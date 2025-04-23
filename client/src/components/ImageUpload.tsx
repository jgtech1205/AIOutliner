import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface UploadState {
  file: File | null;
  preview: string | null;
  processed: string | null;
  processedBlob: Blob | null;
  isLoading: boolean;
}

const ImageUpload = () => {
  const [state, setState] = useState<UploadState>({
    file: null,
    preview: null,
    processed: null,
    processedBlob: null,
    isLoading: false
  });

  const [session, setSession] = useState<any>(null);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'svg'>('png');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          setState({
            file: null,
            preview: null,
            processed: null,
            processedBlob: null,
            isLoading: false
          });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG/PNG images allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5MB');
      return;
    }

    setState({
      file,
      preview: URL.createObjectURL(file),
      processed: null,
      processedBlob: null,
      isLoading: false
    });
  };

  const processImage = async () => {
    if (!state.file || !session) {
      toast.error(state.file ? 'Please sign in' : 'Select an image first');
      return;
    }

    const cleanName = state.file.name.replace(/ /g, '-');
    const filePath = `${session.user.id}/${Date.now()}-${cleanName}`;

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      toast.loading('Processing image...', { id: 'upload' });

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('uploads')
        .upload(filePath, state.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: state.file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(uploadData.path);

      const apiUrl = import.meta.env.VITE_API_URL;

      const response = await fetch(`${apiUrl}/process-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ image_path: `${publicUrl}?t=${Date.now()}`, format })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process image: ${errorText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setState(prev => ({ ...prev, processed: blobUrl, processedBlob: blob }));
      toast.success('Image processed successfully!', { id: 'upload' });

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Upload failed. Check console for details', { id: 'upload' });

      await supabase.storage
        .from('uploads')
        .remove([filePath])
        .catch(console.warn);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const resetUpload = () => {
    if (state.preview) URL.revokeObjectURL(state.preview);
    if (state.processed) URL.revokeObjectURL(state.processed);
    setState({
      file: null,
      preview: null,
      processed: null,
      processedBlob: null,
      isLoading: false
    });
  };

  const downloadImage = () => {
    if (!state.processedBlob) return;

    const url = URL.createObjectURL(state.processedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `processed-image.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <ImageIcon className="w-6 h-6 mr-2 text-indigo-600" />
            Image Processor
          </h1>
          {state.preview && (
            <button
              onClick={resetUpload}
              className="text-sm text-red-600 hover:text-red-500 flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-medium mb-3">Original Image</h2>
            {state.preview ? (
              <img
                src={state.preview}
                alt="Original"
                className="w-full h-64 object-contain rounded"
              />
            ) : (
              <label className="flex flex-col items-center justify-center h-64 cursor-pointer text-gray-500">
                <Upload className="w-10 h-10 mb-2" />
                <span className="text-indigo-600">Click to upload</span>
                <span className="text-sm">JPG/PNG (max 5MB)</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg, image/png"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Processed Result */}
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-medium mb-3">Processed Result</h2>
            <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded">
              {state.processed ? (
                <>
                  <img
                    src={state.processed}
                    alt="Processed"
                    className="w-full h-full object-contain"
                  />
                  <div className="mt-2">
                    <label className="mr-2 text-sm font-medium">Download as:</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg' | 'svg')}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="svg">SVG</option>
                    </select>
                  </div>
                  <button
                    onClick={downloadImage}
                    className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                  >
                    Download Processed Image
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-400 p-4">
                  {state.preview ? 'Ready to process' : 'Upload an image first'}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={processImage}
          disabled={!state.file || state.isLoading}
          className={`mt-6 w-full py-2 rounded-md flex items-center justify-center ${
            !state.file || state.isLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {state.isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Process Image'
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;
