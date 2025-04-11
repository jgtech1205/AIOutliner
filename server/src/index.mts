import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const Jimp = require('jimp');
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client (ensure your .env has SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Root route for status check
app.get('/', (req: Request, res: Response) => {
  res.send('AIOutliner backend is running');
});

// POST route for processing images
app.post('/process-image', async (req: Request, res: Response) => {
  console.log('Received request body:', req.body);

  // Extract 'image_path' from the request body
  const { image_path } = req.body;
  if (!image_path) {
    return res.status(400).json({ error: 'No image_path provided' });
  }

  try {
    console.log('Processing image:', image_path);

    // Download the image using Jimp
    const image = await Jimp.read(image_path);

    // Process the image (grayscale + edge detection using a Laplacian kernel)
    image.grayscale();
    const edgeKernel = [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1]
    ];
    image.convolute(edgeKernel);

    // Convert the processed image to a PNG buffer
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

    // Generate a unique file name and define a file path in Supabase Storage
    const processedFileName = `processed_${uuidv4()}.png`;
    const filePath = `images/${processedFileName}`;
    console.log('Uploading processed image to:', filePath);

    // Upload processed image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, processedBuffer, {
        contentType: 'image/png',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload processed image' });
    }

    // Retrieve the public URL for the processed image
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    console.log('Processed image uploaded. Public URL:', publicUrl);

    // Return the response with the processed image URL
    return res.status(200).json({
      message: 'Image processed successfully',
      processed_image_url: publicUrl
    });
  } catch (error: any) {
    console.error('Error processing image:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
