import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM = `"RuneClipy" <${process.env.SMTP_USER || "noreply@runeclipy.com"}>`;

// ─── Shared layout wrapper ──────────────────────────────
function emailWrapper(title: string, content: string) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#0B0E14;border-radius:16px;overflow:hidden;border:1px solid #1E293B">
      <div style="background:linear-gradient(135deg,#8B5CF6,#EC4899);padding:32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:2px">🔮 RuneClipy</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px">${title}</p>
      </div>
      <div style="padding:32px;text-align:center">
        ${content}
      </div>
      <div style="background:#111827;padding:16px;text-align:center;border-top:1px solid #1E293B">
        <p style="color:#4B5563;font-size:11px;margin:0">© 2026 RuneClipy. All rights reserved.</p>
      </div>
    </div>
  `;
}

// ─── OTP Email ───────────────────────────────────────────
export async function sendOTPEmail(to: string, otp: string) {
  const html = emailWrapper("Verification Code", `
    <p style="color:#9CA3AF;font-size:14px;margin:0 0 24px">Your OTP verification code is:</p>
    <div style="background:#1F2937;border:2px solid #8B5CF6;border-radius:12px;padding:20px;display:inline-block">
      <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#F9FAFB;font-family:monospace">${otp}</span>
    </div>
    <p style="color:#6B7280;font-size:12px;margin:24px 0 0">This code expires in <strong style="color:#F59E0B">5 minutes</strong></p>
    <p style="color:#6B7280;font-size:12px;margin:8px 0 0">If you didn't request this, please ignore this email.</p>
  `);

  await transporter.sendMail({ from: FROM, to, subject: "🔮 RuneClipy — Your Verification Code", html });
}

// ─── Welcome Email ───────────────────────────────────────
export async function sendWelcomeEmail(to: string, username: string) {
  const html = emailWrapper("Welcome to RuneClipy! 🎉", `
    <p style="color:#F9FAFB;font-size:18px;font-weight:700;margin:0 0 8px">Hey @${username}!</p>
    <p style="color:#9CA3AF;font-size:14px;margin:0 0 24px;line-height:1.6">
      Welcome to RuneClipy — the platform where TikTok creators earn money from campaigns. Here's what to do next:
    </p>
    <div style="text-align:left;background:#1F2937;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="color:#F9FAFB;font-size:13px;margin:0 0 12px">✅ <strong>Connect your TikTok</strong> — Verify your account</p>
      <p style="color:#F9FAFB;font-size:13px;margin:0 0 12px">🎵 <strong>Browse campaigns</strong> — Find ones that match your style</p>
      <p style="color:#F9FAFB;font-size:13px;margin:0">💰 <strong>Submit & earn</strong> — Get paid for your content</p>
    </div>
    <a href="${process.env.NEXTAUTH_URL || 'https://runeclipy.com'}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#8B5CF6,#EC4899);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none">
      Go to Dashboard →
    </a>
  `);

  await transporter.sendMail({ from: FROM, to, subject: "🔮 Welcome to RuneClipy!", html });
}

// ─── Submission Approved Email ───────────────────────────
export async function sendApprovedEmail(to: string, username: string, campaignTitle: string, earned: number) {
  const html = emailWrapper("Submission Approved ✅", `
    <p style="color:#9CA3AF;font-size:14px;margin:0 0 8px">Hey @${username}, great news!</p>
    <p style="color:#F9FAFB;font-size:16px;font-weight:700;margin:0 0 24px">Your submission for "${campaignTitle}" has been approved!</p>
    <div style="background:#1F2937;border:2px solid #22C55E;border-radius:12px;padding:20px;display:inline-block;margin:0 0 24px">
      <p style="color:#6B7280;font-size:12px;margin:0 0 4px">You earned</p>
      <span style="font-size:32px;font-weight:800;color:#22C55E;font-family:monospace">$${earned.toFixed(2)}</span>
    </div>
    <p style="color:#6B7280;font-size:12px;margin:0">Earnings have been added to your balance. You can withdraw when ready.</p>
  `);

  await transporter.sendMail({ from: FROM, to, subject: `✅ Submission Approved — ${campaignTitle}`, html });
}

// ─── Payout Processed Email ──────────────────────────────
export async function sendPayoutEmail(to: string, username: string, amount: number, netAmount: number, method: string) {
  const html = emailWrapper("Payout Processed 💸", `
    <p style="color:#9CA3AF;font-size:14px;margin:0 0 24px">Hey @${username}, your payout has been processed!</p>
    <div style="background:#1F2937;border-radius:12px;padding:20px;text-align:left;margin:0 0 16px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#6B7280;font-size:13px;padding:6px 0">Amount</td><td style="color:#F9FAFB;font-size:13px;text-align:right;font-weight:700">$${amount.toFixed(2)}</td></tr>
        <tr><td style="color:#6B7280;font-size:13px;padding:6px 0">Fee (3%)</td><td style="color:#EF4444;font-size:13px;text-align:right">-$${(amount - netAmount).toFixed(2)}</td></tr>
        <tr style="border-top:1px solid #374151"><td style="color:#F9FAFB;font-size:14px;padding:10px 0 6px;font-weight:700">You receive</td><td style="color:#22C55E;font-size:16px;text-align:right;font-weight:800">$${netAmount.toFixed(2)}</td></tr>
      </table>
    </div>
    <p style="color:#6B7280;font-size:12px;margin:0">Payment sent via <strong style="color:#F9FAFB">${method}</strong>. Please allow 1-3 business days.</p>
  `);

  await transporter.sendMail({ from: FROM, to, subject: "💸 RuneClipy — Payout Processed!", html });
}
