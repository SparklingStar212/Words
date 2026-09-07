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
import userRoutes from "./routes/userRoutes.js"; // 👈 1. Import your user routes file
import Word from "./models/Word.js";

dotenv.config();

// Auto-cleanup legacy placeholder words upon server boot
async function cleanLegacyWords() {
  try {
    const result = await Word.deleteMany({
      $or: [
        { example: { $regex: /Using the word.*in a sentence/i } },
        {
          definition: { $regex: /A valuable term for professional contexts/i },
        },
      ],
    });

    if (result.deletedCount > 0) {
      console.log(
        `🧹 Auto-Cleanup: Removed ${result.deletedCount} legacy placeholder words from MongoDB.`,
      );
    }
  } catch (err) {
    console.error("Auto-cleanup error:", err);
  }
}

// Connect to DB and run cleanup
connectDB().then(async () => {
  await cleanLegacyWords();
});

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // 👈 2. Mount it here so /api/users/field works!
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
