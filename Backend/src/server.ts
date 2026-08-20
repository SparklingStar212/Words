import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { initReminderCron } from "./services/reminderService.js";
import pushRoutes from "./routes/pushRoutes.js";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/push", pushRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to Words API - MVP" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

initReminderCron();
