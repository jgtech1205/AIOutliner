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

app.use(express.json({ limit: '10mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health Check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Image Processing
app.post('/process-image', async (req: Request, res: Response) => {
  try {
    const { image_path } = req.body;
    if (!image_path) return res.status(400).json({ error: 'image_path is required' });

    const response = await fetch(image_path);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedBuffer = await sharp(buffer)
      .resize({ width: 800 }) // Resize
     // .flatten({ background: { r: 255, g: 255, b: 255 } }) // Force white background
      .grayscale() // Convert to grayscale
      .convolve({ // Apply edge detection
        width: 3,
        height: 3,
        kernel: [
          -1, -1, -1,
          -1, 8, -1,
          -1, -1, -1
        ]
      })
      .negate({ alpha: false }) // Invert grayscale colors to get black outline on white
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename=processed.png');
    res.send(processedBuffer);
  } catch (error: any) {
    console.error('Processing Error:', error);
    res.status(500).json({
      error: error.message || 'Image processing failed'
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
