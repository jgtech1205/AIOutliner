// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { decode } from "npm:base64-arraybuffer@1.0.2";
import * as tf from 'npm:@tensorflow/tfjs@4.17.0';
import { createCanvas, loadImage } from 'npm:canvas@2.11.2';
import { serve } from "https://deno.land/std/http/server.ts";

console.info('Server started');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

async function loadImageFromUrl(url: string): Promise<tf.Tensor3D> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create canvas and load image
    const img = await loadImage(uint8Array);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to tensor
    return tf.browser.fromPixels(imageData);
  } catch (error) {
    console.error('Error loading image:', error);
    throw new Error(`Failed to load image: ${error.message}`);
  }
}

async function preprocessImage(tensor: tf.Tensor3D): Promise<tf.Tensor4D> {
  // Normalize and expand dimensions
  return tf.tidy(() => {
    const normalized = tensor.toFloat().div(255);
    return normalized.expandDims(0);
  });
}

async function loadDexiNedModel() {
  try {
    // Load DexiNed model
    const MODEL_URL = 'https://raw.githubusercontent.com/xavysp/DexiNed/master/model.json';
    const model = await tf.loadGraphModel(MODEL_URL);
    return model;
  } catch (error) {
    console.error('Error loading DexiNed model:', error);
    throw new Error('Failed to load DexiNed model');
  }
}

async function detectEdges(tensor: tf.Tensor4D): Promise<tf.Tensor3D> {
  const model = await loadDexiNedModel();
  
  return tf.tidy(() => {
    // Run inference
    const predictions = model.predict(tensor) as tf.Tensor4D;
    // Get the first image from batch
    const edges = predictions.squeeze();
    // Normalize output to 0-255 range
    return edges.mul(255);
  });
}

async function tensorToBase64(tensor: tf.Tensor3D): Promise<string> {
  const canvas = createCanvas(tensor.shape[0], tensor.shape[1]);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(tensor.shape[1], tensor.shape[0]);
  
  const data = await tensor.data();
  for (let i = 0; i < data.length; i++) {
    imageData.data[i * 4] = data[i];     // R
    imageData.data[i * 4 + 1] = data[i]; // G
    imageData.data[i * 4 + 2] = data[i]; // B
    imageData.data[i * 4 + 3] = 255;     // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function processImage(imageUrl: string): Promise<string> {
  try {
    console.log('Processing image with DexiNed:', imageUrl);
    
    // Load and preprocess image
    const imageTensor = await loadImageFromUrl(imageUrl);
    const preprocessed = await preprocessImage(imageTensor);
    
    // Detect edges
    const edgeTensor = await detectEdges(preprocessed);
    
    // Convert to base64
    const base64Image = await tensorToBase64(edgeTensor);
    
    // Cleanup
    tf.dispose([imageTensor, preprocessed, edgeTensor]);
    
    return base64Image;
  } catch (error) {
    console.error('Error in image processing:', error);
    throw error;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { image_path } = body;

    if (!image_path) {
      return new Response(
        JSON.stringify({ error: 'No image path provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Processing image:', image_path);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process image with DexiNed
    const processedImageData = await processImage(image_path);
    console.log('Image processed with DexiNed');

    // Convert base64 to buffer for upload
    const base64Data = processedImageData.split(',')[1];
    const binaryData = decode(base64Data);

    // Upload processed image
    const processedFileName = `dexined_${Date.now()}.png`;
    
    console.log('Uploading processed image');
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('images')
      .upload(processedFileName, binaryData, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(processedFileName);

    console.log('Successfully processed and uploaded image');

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_image_url: publicUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});