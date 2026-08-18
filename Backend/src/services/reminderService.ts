import cron from "node-cron";
import { Resend } from "resend";
import { User } from "../models/User.js";
import { DailyProgress } from "../models/DailyProgress.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const initReminderCron = () => {
  // Schedule cron job to run every day at 8:00 PM (20:00)
  cron.schedule("0 20 * * *", async () => {
    console.log("Running daily streak reminder cron job...");

    try {
      const today: string = new Date().toISOString().split("T")[0] ?? "";

      // Find all progress records for today that are not completed
      const incompleteProgresses = await DailyProgress.find({
        date: today,
        completed: false,
      }).populate("userId");

      for (const progress of incompleteProgresses) {
        const user = progress.userId as any;
        if (!user || !user.email) continue;

        // Dispatch email via Resend
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: user.email,
          subject: "🔥 Protect your streak! Your daily words are waiting.",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1A;">
              <h2 style="font-serif; color: #D97757;">Don't lose your momentum!</h2>
              <p>Hi there,</p>
              <p>You have an active streak of <strong>${user.streakCount} days</strong>, but you haven't finished your 5 words for today yet.</p>
              <p>Take just 2 minutes to absorb your words and write your custom sentences before midnight.</p>
              <div style="margin: 24px 0;">
                <a href="http://localhost:5173" style="background-color: #D97757; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">Continue Learning</a>
              </div>
              <p style="color: #787570; font-size: 12px;">Keep your habit alive,<br/>The Words App Team</p>
            </div>
          `,
        });

        console.log(`Reminder email sent to: ${user.email}`);
      }
    } catch (error) {
      console.error("Error running reminder cron job:", error);
    }
  });

  console.log(
    "Daily streak reminder cron job initialized (Scheduled for 8:00 PM daily).",
  );
};
