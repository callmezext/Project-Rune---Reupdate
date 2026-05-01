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
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0B0E14;border-radius:20px;overflow:hidden;border:1px solid #1E293B">
      <div style="background:linear-gradient(135deg,#7C3AED 0%,#8B5CF6 30%,#EC4899 70%,#DB2777 100%);padding:40px 32px;text-align:center;position:relative">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2220%22 cy=%2230%22 r=%2240%22 fill=%22rgba(255,255,255,0.03)%22/><circle cx=%2280%22 cy=%2270%22 r=%2250%22 fill=%22rgba(255,255,255,0.02)%22/></svg>')"></div>
        <h1 style="color:#fff;margin:0;font-size:32px;letter-spacing:3px;font-weight:800;position:relative">🔮 RuneClipy</h1>
        <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:14px;font-weight:500;letter-spacing:0.5px;position:relative">${title}</p>
      </div>
      <div style="padding:36px 32px;text-align:center">
        ${content}
      </div>
      <div style="background:#111827;padding:20px 32px;text-align:center;border-top:1px solid #1E293B">
        <p style="color:#4B5563;font-size:11px;margin:0;letter-spacing:0.3px">© 2026 RuneClipy — Creator Music Promotion Platform</p>
      </div>
    </div>
  `;
}

// ─── OTP Email — Beautified ─────────────────────────────
export async function sendOTPEmail(to: string, otp: string) {
  const digits = otp.split("");
  const digitBoxes = digits.map(d =>
    `<td style="width:48px;height:56px;background:linear-gradient(180deg,#1F2937 0%,#111827 100%);border:2px solid #8B5CF6;border-radius:12px;text-align:center;vertical-align:middle;margin:0 4px">
      <span style="font-size:28px;font-weight:800;color:#F9FAFB;font-family:'Courier New',monospace;line-height:56px">${d}</span>
    </td>`
  ).join('<td style="width:8px"></td>');

  const html = emailWrapper("Verification Code", `
    <div style="margin-bottom:28px">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#8B5CF6,#EC4899);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;line-height:64px;text-align:center">
        <span style="font-size:28px;display:block;line-height:64px">🔐</span>
      </div>
      <p style="color:#F9FAFB;font-size:16px;font-weight:600;margin:0 0 4px">Your Verification Code</p>
      <p style="color:#6B7280;font-size:13px;margin:0">Enter this code to verify your identity</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;border-collapse:separate;border-spacing:6px 0">
      <tr>${digitBoxes}</tr>
    </table>

    <div style="background:#1F2937;border-radius:12px;padding:16px;margin:0 0 20px;border-left:3px solid #F59E0B">
      <p style="color:#F59E0B;font-size:12px;font-weight:600;margin:0 0 4px;text-align:left">⏱ Expires in 5 minutes</p>
      <p style="color:#6B7280;font-size:11px;margin:0;text-align:left">If you didn't request this code, you can safely ignore this email.</p>
    </div>
  `);

  await transporter.sendMail({ from: FROM, to, subject: "🔮 RuneClipy — Your Verification Code", html });
}

// ─── Reset Password Email ───────────────────────────────
export async function sendResetPasswordEmail(to: string, otp: string) {
  const digits = otp.split("");
  const digitBoxes = digits.map(d =>
    `<td style="width:48px;height:56px;background:linear-gradient(180deg,#1F2937 0%,#111827 100%);border:2px solid #EF4444;border-radius:12px;text-align:center;vertical-align:middle">
      <span style="font-size:28px;font-weight:800;color:#F9FAFB;font-family:'Courier New',monospace;line-height:56px">${d}</span>
    </td>`
  ).join('<td style="width:8px"></td>');

  const html = emailWrapper("Password Reset", `
    <div style="margin-bottom:28px">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#EF4444,#F59E0B);margin:0 auto 16px;line-height:64px;text-align:center">
        <span style="font-size:28px;display:block;line-height:64px">🔑</span>
      </div>
      <p style="color:#F9FAFB;font-size:16px;font-weight:600;margin:0 0 4px">Reset Your Password</p>
      <p style="color:#6B7280;font-size:13px;margin:0">Use this code to set a new password</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;border-collapse:separate;border-spacing:6px 0">
      <tr>${digitBoxes}</tr>
    </table>

    <div style="background:#1F2937;border-radius:12px;padding:16px;margin:0 0 20px;border-left:3px solid #EF4444">
      <p style="color:#EF4444;font-size:12px;font-weight:600;margin:0 0 4px;text-align:left">⚠️ Security Alert</p>
      <p style="color:#6B7280;font-size:11px;margin:0;text-align:left">If you didn't request a password reset, your account may be at risk. Change your password immediately.</p>
    </div>
  `);

  await transporter.sendMail({ from: FROM, to, subject: "🔑 RuneClipy — Password Reset Code", html });
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
