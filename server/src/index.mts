import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('AIOutliner backend is running');
});

app.post('/process-image', (req: Request, res: Response) => {
  console.log('Received request body:', req.body)

  // 1. Extract 'image_path' from req.body
  const { image_path } = req.body
  if (!image_path) {
    return res.status(400).json({ error: 'No image_path provided' })
  }

  // Add your image processing logic here

  res.status(200).json({ message: 'Image processed successfully' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
