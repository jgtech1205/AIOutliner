import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fetch from 'node-fetch';
import potrace from 'potrace';

const { Potrace } = potrace;

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://your-production-app.com' // Replace with your frontend URL
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

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Image processing route
app.post('/process-image', async (req: Request, res: Response) => {
  try {
    const { image_path, format = 'png' } = req.body;

    if (!image_path) {
      return res.status(400).json({ error: 'image_path is required' });
    }

    // Download the image from Supabase public URL
    const response = await fetch(image_path);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (format === 'svg') {
      // Preprocess and trace as SVG
      const preProcessed = await sharp(buffer)
        .resize({ width: 800 })
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
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .negate()
        .sharpen()
        .toFormat('png')
        .toBuffer();

      const tracer = new Potrace({ threshold: 128 });

      tracer.loadImage(preProcessed, (err, svgData) => {
        if (err) {
          console.error('SVG conversion error:', err);
          return res.status(500).json({ error: 'SVG conversion failed' });
        }

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', 'inline; filename=processed.svg');
        res.setHeader('Content-Length', Buffer.byteLength(svgData));
        res.send(svgData);
      });

    } else {
      // Default to PNG or JPEG
      const pipeline = sharp(buffer)
        .resize({ width: 800 })
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
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .negate()
        .sharpen();

      const outputBuffer = await (
        format === 'jpeg' ? pipeline.jpeg() : pipeline.png()
      ).toBuffer();

      res.setHeader('Content-Type', `image/${format}`);
      res.setHeader('Content-Disposition', `inline; filename=processed.${format}`);
      res.setHeader('Content-Length', outputBuffer.length);
      res.send(outputBuffer);
    }

  } catch (error: any) {
    console.error('Processing Error:', error);
    res.status(500).json({
      error: error.message || 'Image processing failed'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
