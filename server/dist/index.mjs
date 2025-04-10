import express from 'express';
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
app.get('/', (req, res) => {
    res.send('AIOutliner backend is running');
});
// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
