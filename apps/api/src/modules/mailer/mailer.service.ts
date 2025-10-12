import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    auth: (process.env.SMTP_USER && process.env.SMTP_PASS)
      ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }
      : undefined,
  });

  async sendMagicLink(to: string, url: string) {
    const from = process.env.SMTP_FROM || "Blueprint <no-reply@local.test>";
    await this.transporter.sendMail({
      from, to,
      subject: "Sign in to Blueprint",
      html: `<p>Hi! Click to sign in:</p><p><a href="${url}">${url}</a></p>`,
      text: `Sign in: ${url}`
    });
  }
}
