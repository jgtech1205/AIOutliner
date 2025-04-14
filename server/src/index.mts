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

    // Process with Sharp (add white background, grayscale + edge detection)
    const processedBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize({ width: 800 }) // Resize if needed
      .raw() // Get raw pixel data
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        const { width, height } = info;

        // Create a new image with a white background
        const whiteBackground = Buffer.alloc(width * height * 3, 255); // White background

        // Create a new image with edges
        const edgeImage = Buffer.alloc(width * height * 4); // RGBA

        for (let i = 0; i < data.length; i++) {
          const value = data[i];
          edgeImage[i * 4] = value;     // R
          edgeImage[i * 4 + 1] = value; // G
          edgeImage[i * 4 + 2] = value; // B
          edgeImage[i * 4 + 3] = 255;   // A
        }

        // Combine the white background and edge image
        return sharp(whiteBackground, { raw: { width, height, channels: 3 } })
          .composite([{ input: edgeImage, blend: 'over' }])
          .png()
          .toBuffer();
      });

    // Respond with image file
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

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
