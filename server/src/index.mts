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

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-production-app.com' // Replace with your deployed frontend URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Supabase Client (for future use)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health Check Endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Image Processing Endpoint
app.post('/process-image', async (req: Request, res: Response) => {
  try {
    const { image_path } = req.body;

    if (!image_path) {
      return res.status(400).json({ error: 'image_path is required' });
    }

    // Download image from URL
    const response = await fetch(image_path);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Process with Sharp (grayscale + edge detection + flatten white background)
    const processedBuffer = await sharp(Buffer.from(arrayBuffer))
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          -1, -1, -1,
          -1, 8, -1,
          -1, -1, -1
        ]
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // ✅ White background
      .png()
      .toBuffer();

    // Convert to base64
    const base64 = processedBuffer.toString('base64');
    const base64DataUri = `data:image/png;base64,${base64}`;

    res.status(200).json({
      message: 'Image processed successfully',
      base64_image: base64DataUri
    });

  } catch (error: any) {
    console.error('Processing Error:', error);
    res.status(500).json({
      error: error.message || 'Image processing failed'
    });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
