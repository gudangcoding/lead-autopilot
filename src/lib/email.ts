import nodemailer from "nodemailer";
import { getSmtpConfig } from "./settings";

export async function sendEmail(to: string, subject: string, text: string) {
  const cfg = await getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) throw new Error("SMTP belum dikonfigurasi");
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  const info = await transporter.sendMail({ from: cfg.from, to, subject, text });
  return info.messageId;
}

export async function testSmtp(to: string) {
  const id = await sendEmail(to, "Test SMTP Lead Autopilot", "Ini adalah email test dari Lead Autopilot.");
  return { ok: true, messageId: id };
}
