import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { Potrace } from 'potrace'; // npm install potrace

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://your-production-app.com'
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

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/process-image', async (req: Request, res: Response) => {
  try {
    const { image_path, format = 'png' } = req.body;

    if (!image_path) {
      return res.status(400).json({ error: 'image_path is required' });
    }

    const response = await fetch(image_path);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    let mimeType = '';
    let filename = '';
    let outputBuffer: Buffer;

    const sharpPipeline = sharp(buffer)
      .resize({ width: 800 })
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // white background
      .negate()
      .sharpen();

    switch (format) {
      case 'png':
        mimeType = 'image/png';
        filename = 'processed.png';
        outputBuffer = await sharpPipeline.png().toBuffer();
        break;
      case 'jpeg':
        mimeType = 'image/jpeg';
        filename = 'processed.jpeg';
        outputBuffer = await sharpPipeline.jpeg().toBuffer();
        break;
      case 'svg':
        mimeType = 'image/svg+xml';
        filename = 'processed.svg';


const svg = await new Promise<string>((resolve, reject) => {
  new Potrace().loadImage(buffer, (err: Error | null, svgData: string) => {
    if (err) return reject(err);
    resolve(svgData);
  });
});

        outputBuffer = Buffer.from(svg);
        break;
      case 'dst':
        mimeType = 'application/octet-stream';
        filename = 'processed.dst';
        outputBuffer = Buffer.from('DST conversion not implemented yet.', 'utf-8');
        break;
      default:
        throw new Error('Unsupported format requested');
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(outputBuffer);

  } catch (error: any) {
    console.error('Processing Error:', error);
    res.status(500).json({ error: error.message || 'Image processing failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
});
