import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { Potrace } from 'potrace';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ai-outliner.vercel.app',
  'https://aioutliner1.vercel.app' 
];

// More explicit CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      supabase: process.env.SUPABASE_URL ? 'configured' : 'not configured',
      sharp: 'available',
      potrace: 'available'
    }
  });
});

// Health check for image processing
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.storage.listBuckets();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: error ? 'error' : 'connected',
        storage: data ? 'available' : 'unavailable',
        processing: 'ready'
      }
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Image processing endpoint
app.post('/process-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image_path, format = 'png' } = req.body;

    if (!image_path) {
      res.status(400).json({ error: 'image_path is required' });
      return;
    }

    console.log('Processing image:', image_path, 'format:', format);

    // Set longer timeout for image processing
    req.setTimeout(60000); // 60 seconds
    res.setTimeout(60000);

    // Fetch image with better error handling and timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response;
    try {
      response = await fetch(image_path, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AI-Outliner/1.0',
        },
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to fetch image: ${fetchError.message}`);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Image fetched successfully, size:', buffer.length, 'bytes');

    if (format === 'svg') {
      // Optimize SVG processing
      const preProcessed = await sharp(buffer)
        .resize({ width: 600, height: 600, fit: 'inside' }) // Smaller size for faster processing
        .grayscale()
        .normalize()
        .threshold(120)
        .toFormat('png')
        .toBuffer();

      const tracer = new Potrace({
        threshold: 128,
        turdSize: 50,
        optTolerance: 0.4,
        color: 'black',
        background: 'white'
      });

      // Wrap Potrace in a Promise with timeout
      const svgPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SVG processing timeout'));
        }, 30000);

        tracer.loadImage(preProcessed, (err: Error | null, svgData: string) => {
          clearTimeout(timeout);
          if (err) {
            console.error('SVG conversion error:', err);
            reject(err);
          } else {
            resolve(svgData);
          }
        });
      });

      try {
        const svgData = await svgPromise;
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', 'inline; filename=processed.svg');
        res.setHeader('Content-Length', Buffer.byteLength(svgData));
        res.send(svgData);
        
        console.log('SVG processing completed successfully');
      } catch (svgError) {
        console.error('SVG processing failed:', svgError);
        throw new Error('SVG conversion failed');
      }

    } else {
      // Optimize PNG/JPEG processing
      const pipeline = sharp(buffer)
        .resize({ width: 800, height: 800, fit: 'inside' }) // Limit size for faster processing
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
        format === 'jpeg' 
          ? pipeline.jpeg({ quality: 85 }) 
          : pipeline.png({ compressionLevel: 6 })
      ).toBuffer();

      res.setHeader('Content-Type', `image/${format}`);
      res.setHeader('Content-Disposition', `inline; filename=processed.${format}`);
      res.setHeader('Content-Length', outputBuffer.length);
      res.send(outputBuffer);
      
      console.log(`${format.toUpperCase()} processing completed successfully, output size:`, outputBuffer.length, 'bytes');
    }

  } catch (error: any) {
    console.error('Processing Error:', error);
    
    // Send appropriate error response
    if (!res.headersSent) {
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        res.status(408).json({
          error: 'Request timeout - image processing took too long',
          details: error.message
        });
      } else if (error.message.includes('fetch')) {
        res.status(400).json({
          error: 'Failed to fetch image from URL',
          details: error.message
        });
      } else {
        res.status(500).json({
          error: 'Image processing failed',
          details: error.message
        });
      }
    }
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const server = app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`📊 Health check available at: http://localhost:${port}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Set server timeout
server.timeout = 120000; // 2 minutes
