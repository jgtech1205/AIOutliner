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

app.post('/process-image', async (req: Request, res: Response) => {
  try {
    const { image_path } = req.body;
    if (!image_path) return res.status(400).json({ error: 'image_path is required' });

    // Download image
    const response = await fetch(image_path);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Apply edge detection and get raw grayscale output
    const { data, info } = await sharp(inputBuffer)
      .resize({ width: 800 })
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          -1, -1, -1,
          -1,  8, -1,
          -1, -1, -1
        ]
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;

    // Convert raw grayscale output to RGBA with white background
    const rgbaBuffer = Buffer.alloc(width * height * 4, 255); // start with white
    for (let i = 0; i < width * height; i++) {
      const v = data[i];
      rgbaBuffer[i * 4 + 0] = v; // R
      rgbaBuffer[i * 4 + 1] = v; // G
      rgbaBuffer[i * 4 + 2] = v; // B
      rgbaBuffer[i * 4 + 3] = 255; // A
    }

    // Render final image
    const finalImage = await sharp(rgbaBuffer, {
      raw: {
        width,
        height,
        channels: 4
      }
    }).png().toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename=processed.png');
    res.send(finalImage);

  } catch (error: any) {
    console.error('Processing Error:', error);
    res.status(500).json({ error: error.message || 'Image processing failed' });
  }
});
