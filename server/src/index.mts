import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.send('AIOutliner backend is running');
});

// Process image and return base64-encoded result
app.post('/process-image', async (req: Request, res: Response) => {
  const { image_path } = req.body;

  if (!image_path) {
    return res.status(400).json({ error: 'No image_path provided' });
  }

  try {
    // Compatible import for CommonJS-style Jimp
    const jimpModule = await import('jimp');
    const Jimp = (jimpModule as any).default || jimpModule;
    const image = await Jimp.read(image_path);
  
    // Apply grayscale
    image.grayscale();
  
    // Edge detection
    const edgeKernel = [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ];
    image.convolute(edgeKernel);
  
    // Convert to buffer and base64
    const buffer = await image.getBufferAsync('image/png');
    const base64Image = buffer.toString('base64');
    const base64DataUri = `data:image/png;base64,${base64Image}`;
  
    return res.status(200).json({
      message: 'Image processed successfully',
      base64_image: base64DataUri,
    });
  } catch (error: any) {
    console.error('Error processing image:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
  
  
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
