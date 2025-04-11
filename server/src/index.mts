import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
}));
app.use(express.json({ limit: '25mb' }));

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.send('AIOutliner backend is running');
});

// Process image and return base64-encoded result
app.post('/process-image', async (req: Request, res: Response) => {
  const { image_url } = req.body; // Changed from image_path to accept URLs

  if (!image_url) {
    return res.status(400).json({ error: 'No image_url provided' });
  }

  try {
    // 1. Download the image
    const response = await fetch(image_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();

    // 2. Process with Sharp
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Edge detection
      })
      .png()
      .toBuffer();

    // 3. Convert to base64
    const base64Image = processedBuffer.toString('base64');
    const base64DataUri = `data:image/png;base64,${base64Image}`;

    return res.status(200).json({
      message: 'Image processed successfully',
      base64_image: base64DataUri,
    });

  } catch (error: any) {
    console.error('❌ Image processing error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🖼️ Image processor ready at http://localhost:${port}/process-image`);
});