import env from "@/config/env";
import { logger } from "@/config/pino";
import nodemailer, { Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Example usage:
// await sendEmail({
//   to: 'recipient@example.com',
//   subject: 'Test Email',
//   text: 'This is a test email',
//   html: '<p>This is a test email</p>'
// });

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: EmailOptions): Promise<void> {
  // Create a transporter using SMTP
  const transporter: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  try {
    // Send mail with defined transport object
    await transporter.sendMail({
      from: env.SMTP_FROM || "noreply@aylx.com",
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error sending email to ${to}: ${errorMessage}`);
  }
}
