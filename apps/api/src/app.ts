import express from 'express';
import cors from 'cors';
import { config } from '@lumen/config';
import { connectDB } from './config/db';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const start = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`🚀 API running on http://localhost:${config.port}`);
  });
};

start();
