import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import prescriptionRoutes from './routes/prescription.routes';
import { errorHandler } from './middleware';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5001;

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api', prescriptionRoutes);
app.get('/api/health', (req: Request, res: Response) => {
  res
    .status(200)
    .json({ status: 'UP', message: 'LumenHealth backend is running.' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend server is running at http://localhost:${PORT}`);
});
