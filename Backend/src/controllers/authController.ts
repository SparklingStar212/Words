import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Resend } from "resend";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me";
const resend = new Resend(process.env.RESEND_API_KEY);

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password, preferredLevel } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists." });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await User.create({
      email,
      passwordHash,
      preferredLevel: preferredLevel || "Intermediate",
      streakCount: 0,
    });

    // --- SEND WELCOME EMAIL VIA RESEND ---
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Words App <onboarding@resend.dev>",
          to: newUser.email,
          subject: "Welcome to Words! 🚀 Your daily habit starts now.",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1A;">
              <h2 style="color: #D97757;">Welcome aboard, learner!</h2>
              <p>Hi there,</p>
              <p>Thank you for creating an account with <strong>Words</strong>. Your daily vocabulary level is set to <strong>${newUser.preferredLevel}</strong>.</p>
              <p>Every day, you'll receive 5 hand-picked words to absorb, listen to, and master by writing your own custom sentences. Consistency is the secret to fluency!</p>
              <div style="margin: 24px 0;">
                <a href="${process.env.FRONTEND_BASE_URL || "http://localhost:5173"}" style="background-color: #D97757; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">Open Your Dashboard</a>
              </div>
              <p style="color: #787570; font-size: 12px;">Let's build that streak,<br/>The Words App Team</p>
            </div>
          `,
        });
        console.log(`Welcome email successfully sent to: ${newUser.email}`);
      } catch (emailErr) {
        // Non-blocking catch so signup succeeds even if email dispatch encounters an issue
        console.error(
          `Failed to send welcome email to ${newUser.email}:`,
          emailErr,
        );
      }
    }

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        streakCount: newUser.streakCount,
        preferredLevel: newUser.preferredLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ error: "Invalid email or password." });
      return;
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: "Invalid email or password." });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        streakCount: user.streakCount,
        preferredLevel: user.preferredLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const updatePreferredLevel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, preferredLevel } = req.body;

    if (!userId || !preferredLevel) {
      res
        .status(400)
        .json({ error: "User ID and preferred level are required." });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { preferredLevel },
      { new: true },
    );

    if (!updatedUser) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.status(200).json({
      message: "Preferred level updated successfully",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        streakCount: updatedUser.streakCount,
        preferredLevel: updatedUser.preferredLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};