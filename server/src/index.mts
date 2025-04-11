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

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',        // Vite default
    'http://localhost:3000',        // Create React App default
    'https://your-production-app.com' // Your production frontend
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Image processing endpoint
app.post('/process-image', async (req: Request, res: Response) => {
  try {
    const { image_url } = req.body;

    // Validate input
    if (!image_url) {
      return res.status(400).json({ error: 'Missing image_url parameter' });
    }

    if (!isValidUrl(image_url)) {
      return res.status(400).json({ error: 'Invalid image URL format' });
    }

    // Download image
    const response = await fetch(image_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // Process with Sharp
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Edge detection
      })
      .png()
      .toBuffer();

    // Convert to base64
    const base64Image = processedBuffer.toString('base64');
    const base64DataUri = `data:image/png;base64,${base64Image}`;

    res.status(200).json({
      success: true,
      base64_image: base64DataUri,
      processed_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Image processing error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// URL validation helper
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|webp)$/i.test(url);
  } catch {
    return false;
  }
}

// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🖼️ Image processor ready at http://localhost:${port}/process-image`);
  console.log(`🌐 CORS configured for: ${corsOptions.origin.join(', ')}`);
});

// Handle uncaught exceptions
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});