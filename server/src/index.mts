import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sharp from 'sharp';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

// Simple CORS - adjust as needed
app.use(cors());

// Image Processing Endpoint with direct download
app.post('/download-processed-image', async (req: Request, res: Response) => {
  try {
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).send('Image URL is required');
    }

    // Download and process image
    const response = await fetch(image_url);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    // Set headers for direct download
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="processed-image.png"');

    // Stream processing directly to response
    await sharp(await response.arrayBuffer())
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          0,  -0.5,  0,
          -0.5,  3, -0.5,
          0,  -0.5,  0
        ]
      })
      .linear(1.1, -10)
      .threshold(250)
      .flatten({ background: '#ffffff' })
      .png()
      .pipe(res); // Stream directly to response

  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).send(error.message || 'Processing failed');
  }
});

app.listen(port, () => {
  console.log(`Server ready at http://localhost:${port}`);
});