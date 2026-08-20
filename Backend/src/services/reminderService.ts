import cron from "node-cron";
import { Resend } from "resend";
import webpush from "web-push";
import { User } from "../models/User.js";
import { DailyProgress } from "../models/DailyProgress.js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Configure web-push with your VAPID keys from environment variables
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:support@wordsapp.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || "",
);

// Configure web-push only if keys are provided and valid
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@wordsapp.com',
      process.env.VAPID_PUBLIC_KEY.trim(),
      process.env.VAPID_PRIVATE_KEY.trim()
    );
  } catch (err) {
    console.warn('Warning: VAPID keys are invalid. Push notifications will be disabled.', err);
  }
}

export const initReminderCron = () => {
  // Schedule cron job to run every day at 8:00 PM (20:00)
  cron.schedule("0 20 * * *", async () => {
    console.log("Running daily streak reminder cron job (Email & Push)...");

    try {
      const today: string = new Date().toISOString().split("T")[0] ?? "";

      // Find all progress records for today that are not completed
      const incompleteProgresses = await DailyProgress.find({
        date: today,
        completed: false,
      }).populate("userId");

      for (const progress of incompleteProgresses) {
        const user = progress.userId as any;
        if (!user) continue;

        // 1. Dispatch Email Reminder via Resend
        if (user.email) {
          try {
            await resend.emails.send({
              from: process.env.EMAIL_FROM || "onboarding@resend.dev",
              to: user.email,
              subject: "🔥 Protect your streak! Your daily words are waiting.",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1A;">
                  <h2 style="color: #D97757;">Don't lose your momentum!</h2>
                  <p>Hi there,</p>
                  <p>You have an active streak of <strong>${user.streakCount} days</strong>, but you haven't finished your 5 words for today yet.</p>
                  <p>Take just 2 minutes to absorb your words and write your custom sentences before midnight.</p>
                  <div style="margin: 24px 0;">
                    <a href="${process.env.FRONTEND_BASE_URL}" style="background-color: #D97757; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">Continue Learning</a>
                  </div>
                  <p style="color: #787570; font-size: 12px;">Keep your habit alive,<br/>The Words App Team</p>
                </div>
              `,
            });
            console.log(`Reminder email sent to: ${user.email}`);
          } catch (emailErr) {
            console.error(`Failed to send email to ${user.email}:`, emailErr);
          }
        }

        // 2. Dispatch Native Web Push Notification
        if (user.pushSubscription) {
          const pushPayload = JSON.stringify({
            title: "🔥 Protect Your Streak!",
            body: `You have an active streak of ${user.streakCount} days. Finish your 5 words for today before midnight!`,
            icon: "/android-chrome-192x192.png",
            url: "process.env.FRONTEND_BASE_URL",
          });

          try {
            await webpush.sendNotification(user.pushSubscription, pushPayload);
            console.log(`Push notification sent to user: ${user._id}`);
          } catch (pushErr: any) {
            console.error(
              `Failed to send push notification to user ${user._id}:`,
              pushErr,
            );
            // If subscription is expired or invalid (404/410), clean it up from database
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              await User.findByIdAndUpdate(user._id, {
                pushSubscription: null,
              });
              console.log(
                `Removed expired push subscription for user: ${user._id}`,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error running reminder cron job:", error);
    }
  });

  console.log(
    "Daily streak reminder cron job initialized (Scheduled for 8:00 PM daily).",
  );
};
