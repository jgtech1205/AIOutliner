import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
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
// Health check
app.get('/', (req, res) => {
    res.send('AIOutliner backend is running');
});
app.post('/process-image', async (req, res) => {
    const { image_path } = req.body;
    if (!image_path) {
        return res.status(400).json({ error: 'No image_path provided' });
    }
    try {
        // Dynamically import Jimp
        const jimpModule = await import('jimp');
        const Jimp = jimpModule;
        // Load image
        const image = new Jimp(image_path);
        // Grayscale
        image.grayscale();
        // Edge detection
        const edgeKernel = [
            [-1, -1, -1],
            [-1, 8, -1],
            [-1, -1, -1],
        ];
        image.convolute(edgeKernel);
        // Convert to buffer (manually specify MIME type)
        const buffer = await image.getBufferAsync('image/png');
        // Upload to Supabase
        const processedFileName = `processed_${uuidv4()}.png`;
        const filePath = `images/${processedFileName}`;
        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, buffer, {
            contentType: 'image/png',
            cacheControl: '3600',
        });
        if (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload processed image' });
        }
        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
        return res.status(200).json({
            message: 'Image processed successfully',
            processed_image_url: publicUrl,
        });
    }
    catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
        });
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
