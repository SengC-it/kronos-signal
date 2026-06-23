import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getConfig, isConfigured } from "@/lib/config";

type EmailInput = {
  subject: string;
  text: string;
  html?: string;
};

export async function sendSignalEmail(input: EmailInput) {
  const config = getConfig();

  if (isConfigured(config.resendApiKey, config.mailFrom, config.mailTo)) {
    const resend = new Resend(config.resendApiKey);
    const result = await resend.emails.send({
      from: config.mailFrom!,
      to: config.mailTo!.split(",").map((mail) => mail.trim()),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { provider: "resend", dryRun: false, id: result.data?.id ?? null };
  }

  if (isConfigured(config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPass, config.mailFrom, config.mailTo)) {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    const result = await transporter.sendMail({
      from: config.mailFrom,
      to: config.mailTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { provider: "smtp", dryRun: false, id: result.messageId };
  }

  return {
    provider: "dry-run",
    dryRun: true,
    id: null,
    preview: {
      subject: input.subject,
      text: input.text,
    },
  };
}
