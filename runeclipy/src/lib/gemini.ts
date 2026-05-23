import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Part } from "@google/generative-ai";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import Submission from "@/models/Submission";
import Transaction from "@/models/Transaction";
import ActivityLog from "@/models/ActivityLog";
import SiteSetting from "@/models/SiteSetting";
import BotStatus from "@/models/BotStatus";

// ─── System Prompt ───────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `Kamu adalah AI Admin Assistant untuk platform RuneClipy — sebuah platform TikTok creator marketing.
Kamu membantu admin mengelola platform secara efisien.

Kemampuanmu:
- Mencari dan menganalisis data user, campaign, submission, transaksi, setting platform, dan status bot
- Mengedit data user (role, tier, balance, ban/unban)
- Mengelola campaign (edit status, budget)  
- Approve/reject submission
- Melihat dan mengubah setting platform (platform fee, minimum withdrawal, dll)
- Melihat status dan mengontrol Discord Bot (start, stop, restart)
- Menganalisis tren dan memberikan insight

Panduan Gaya Bicara & Perilaku (SANGAT PENTING):
1. TO THE POINT: Berikan jawaban yang langsung ke inti masalah, singkat, padat, dan profesional. JANGAN gunakan basa-basi, jangan beri salam pembuka/penutup yang panjang, dan hilangkan obrolan santai yang tidak perlu.
2. PROSEDUR KONFIRMASI WAJIB (SEBELUM EKSEKUSI): Untuk semua aksi memodifikasi data, sensitif, atau berbahaya (seperti 'edit_user', 'edit_campaign', 'update_submission', 'edit_site_settings', 'send_bot_command'):
   - Kamu TIDAK BOLEH langsung memanggil/mengeksekusi tool tersebut pada request pertama admin.
   - Kamu harus menjawab terlebih dahulu secara to-the-point: sebutkan aksi apa yang akan dilakukan, parameter perubahannya, dampaknya secara ringkas, dan meminta konfirmasi eksplisit dari admin (misal: 'Saya akan menonaktifkan kampanye X. Apakah Anda yakin? Jawab Ya atau Tidak').
   - Hanya setelah admin membalas 'Ya', 'Ya, silakan', atau persetujuan eksplisit sejenisnya pada percakapan berikutnya, kamu diperbolehkan memanggil tool yang bersangkutan.
   - JANGAN memanggil tool pengubah data sebelum admin mengonfirmasi 'Ya' di riwayat pesan sebelumnya!
3. Sertakan data yang relevan dalam responsmu menggunakan format yang rapi (list, tabel jika perlu).
4. Jika ada error, jelaskan dengan jelas apa yang terjadi.

Platform context:
- User memiliki tier: bronze, silver, gold, diamond
- User memiliki role: user, moderator, admin  
- Campaign memiliki status: active, paused, ended
- Submission status: pending, approved, rejected, paid_out
- Mata uang: USD ($)`;

// ─── Function Declarations (Tools) ────────────────────────────────────────────
export const tools: FunctionDeclaration[] = [
  {
    name: "search_users",
    description: "Cari user berdasarkan username, email, role, tier, atau status ban. Gunakan untuk menemukan user tertentu.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Kata kunci pencarian (username atau email)" },
        role: { type: SchemaType.STRING, description: "Filter berdasarkan role: user, moderator, admin" },
        tier: { type: SchemaType.STRING, description: "Filter berdasarkan tier: bronze, silver, gold, diamond" },
        isBanned: { type: SchemaType.BOOLEAN, description: "Filter user yang di-ban (true) atau tidak (false)" },
        limit: { type: SchemaType.NUMBER, description: "Jumlah maksimal hasil (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_user_detail",
    description: "Ambil detail lengkap satu user berdasarkan ID atau username, termasuk stats dan balance.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "MongoDB ObjectId user" },
        username: { type: SchemaType.STRING, description: "Username user" },
      },
      required: [],
    },
  },
  {
    name: "edit_user",
    description: "Edit data user: role, tier, balance campaign, balance referral, ban/unban. TIDAK bisa delete.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "MongoDB ObjectId user yang akan diedit" },
        username: { type: SchemaType.STRING, description: "Username user (alternatif dari userId)" },
        updates: {
          type: SchemaType.OBJECT,
          description: "Data yang ingin diubah",
          properties: {
            role: { type: SchemaType.STRING, description: "Role baru: user, moderator, admin" },
            tier: { type: SchemaType.STRING, description: "Tier baru: bronze, silver, gold, diamond" },
            campaignBalance: { type: SchemaType.NUMBER, description: "Campaign balance baru (USD)" },
            referralBalance: { type: SchemaType.NUMBER, description: "Referral balance baru (USD)" },
            isBanned: { type: SchemaType.BOOLEAN, description: "true untuk ban, false untuk unban" },
          },
        },
        reason: { type: SchemaType.STRING, description: "Alasan perubahan untuk audit log" },
      },
      required: ["updates"],
    },
  },
  {
    name: "get_platform_stats",
    description: "Ambil statistik platform: total user, revenue, campaign aktif, submission pending, dll.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_campaigns",
    description: "Cari campaign berdasarkan judul, status, atau tipe.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Kata kunci judul campaign" },
        status: { type: SchemaType.STRING, description: "Filter status: active, paused, ended" },
        type: { type: SchemaType.STRING, description: "Filter tipe: music, clipping, logo, ugc" },
        limit: { type: SchemaType.NUMBER, description: "Jumlah maksimal hasil (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "edit_campaign",
    description: "Edit campaign: ubah status (active/paused/ended), budget, atau rate.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        campaignId: { type: SchemaType.STRING, description: "MongoDB ObjectId campaign" },
        slug: { type: SchemaType.STRING, description: "Slug campaign (alternatif dari campaignId)" },
        updates: {
          type: SchemaType.OBJECT,
          description: "Data yang ingin diubah",
          properties: {
            status: { type: SchemaType.STRING, description: "Status baru: active, paused, ended" },
            totalBudget: { type: SchemaType.NUMBER, description: "Total budget baru (USD)" },
            ratePerMillionViews: { type: SchemaType.NUMBER, description: "Rate per 1M views baru (USD)" },
          },
        },
        reason: { type: SchemaType.STRING, description: "Alasan perubahan" },
      },
      required: ["updates"],
    },
  },
  {
    name: "search_submissions",
    description: "Cari submission berdasarkan status, campaign, atau user.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Filter status: pending, approved, rejected, paid_out" },
        campaignId: { type: SchemaType.STRING, description: "Filter berdasarkan campaign ID" },
        userId: { type: SchemaType.STRING, description: "Filter berdasarkan user ID" },
        limit: { type: SchemaType.NUMBER, description: "Jumlah maksimal hasil (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "update_submission",
    description: "Approve atau reject sebuah submission.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        submissionId: { type: SchemaType.STRING, description: "MongoDB ObjectId submission" },
        action: { type: SchemaType.STRING, description: "Aksi: approved atau rejected" },
        rejectReason: { type: SchemaType.STRING, description: "Alasan reject (wajib jika action=rejected)" },
      },
      required: ["submissionId", "action"],
    },
  },
  {
    name: "get_transactions",
    description: "Ambil daftar transaksi dengan filter opsional.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "Filter berdasarkan user ID" },
        type: { type: SchemaType.STRING, description: "Filter tipe: campaign_earning, referral_earning, payout, refund" },
        status: { type: SchemaType.STRING, description: "Filter status: pending, completed, failed, rejected" },
        limit: { type: SchemaType.NUMBER, description: "Jumlah maksimal hasil (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_recent_activity",
    description: "Ambil log aktivitas admin terbaru.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Jumlah maksimal hasil (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_site_settings",
    description: "Ambil pengaturan situs / platform (platform fee, minimum withdrawal, support email, dll).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "edit_site_settings",
    description: "Ubah pengaturan situs / platform (seperti platformFeePercent, minCampaignWithdrawal, minReferralWithdrawal, referralCommissionPercent, supportEmail).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        updates: {
          type: SchemaType.OBJECT,
          description: "Pengaturan baru yang ingin disimpan",
          properties: {
            platformFeePercent: { type: SchemaType.NUMBER, description: "Fee platform dalam persen (misal: 3)" },
            minCampaignWithdrawal: { type: SchemaType.NUMBER, description: "Minimal penarikan campaign dalam USD" },
            minReferralWithdrawal: { type: SchemaType.NUMBER, description: "Minimal penarikan referral dalam USD" },
            referralCommissionPercent: { type: SchemaType.NUMBER, description: "Komisi referral dalam persen (misal: 5)" },
            supportEmail: { type: SchemaType.STRING, description: "Email dukungan/support baru" },
          },
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "get_bot_status",
    description: "Ambil status dan statistik Discord Bot (online, ping, server count, heartbeat).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "send_bot_command",
    description: "Kirim perintah kontrol ke Discord Bot: start, stop, atau restart.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: { type: SchemaType.STRING, description: "Perintah: start, stop, restart" },
      },
      required: ["command"],
    },
  },
];

// ─── Tool Executors ───────────────────────────────────────────────────────────
export async function executeTool(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
  actorId: string,
  actorUsername: string
): Promise<unknown> {
  await connectDB();

  switch (name) {
    case "search_users": {
      const filter: Record<string, unknown> = { isDeleted: false };
      if (args.role) filter.role = args.role;
      if (args.tier) filter.tier = args.tier;
      if (typeof args.isBanned === "boolean") filter.isBanned = args.isBanned;
      if (args.query) {
        filter.$or = [
          { username: { $regex: args.query, $options: "i" } },
          { email: { $regex: args.query, $options: "i" } },
          { nickname: { $regex: args.query, $options: "i" } },
        ];
      }
      const users = await User.find(filter)
        .select("username nickname email role tier campaignBalance referralBalance isBanned memberSince stats")
        .sort({ memberSince: -1 })
        .limit(args.limit || 10)
        .lean();
      return { count: users.length, users };
    }

    case "get_user_detail": {
      const filter: Record<string, unknown> = { isDeleted: false };
      if (args.userId) filter._id = args.userId;
      else if (args.username) filter.username = args.username.toLowerCase();
      const user = await User.findOne(filter)
        .select("-password -googleId")
        .lean();
      if (!user) return { error: "User tidak ditemukan" };
      return { user };
    }

    case "edit_user": {
      const filter: Record<string, unknown> = { isDeleted: false };
      if (args.userId) filter._id = args.userId;
      else if (args.username) filter.username = args.username.toLowerCase();

      const user = await User.findOne(filter);
      if (!user) return { error: "User tidak ditemukan" };

      const { updates, reason } = args;
      const allowedFields = ["role", "tier", "campaignBalance", "referralBalance", "isBanned"];
      const appliedChanges: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user as any)[field] = updates[field];
          appliedChanges[field] = updates[field];
        }
      }

      await user.save();

      // Log to activity log
      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: "ai_edit_user",
        target: user._id.toString(),
        targetType: "user",
        details: `AI Assistant mengedit user @${user.username}: ${JSON.stringify(appliedChanges)}. Alasan: ${reason || "Tidak disebutkan"}`,
      });

      return {
        success: true,
        message: `User @${user.username} berhasil diupdate`,
        changes: appliedChanges,
      };
    }

    case "get_platform_stats": {
      const [totalUsers, activeCampaigns, totalCampaigns, pendingSubmissions, totalSubmissions] = await Promise.all([
        User.countDocuments({ isDeleted: false, role: { $ne: "admin" } }),
        Campaign.countDocuments({ status: "active" }),
        Campaign.countDocuments({}),
        Submission.countDocuments({ status: "pending" }),
        Submission.countDocuments({}),
      ]);

      const revenueResult = await Transaction.aggregate([
        { $match: { type: "payout", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const bannedUsers = await User.countDocuments({ isBanned: true, isDeleted: false });
      const totalRevenue = revenueResult[0]?.total || 0;

      const tierBreakdown = await User.aggregate([
        { $match: { isDeleted: false, role: "user" } },
        { $group: { _id: "$tier", count: { $sum: 1 } } },
      ]);

      return {
        totalUsers,
        bannedUsers,
        activeCampaigns,
        totalCampaigns,
        pendingSubmissions,
        totalSubmissions,
        totalRevenuePaidOut: totalRevenue,
        tierBreakdown,
      };
    }

    case "search_campaigns": {
      const filter: Record<string, unknown> = {};
      if (args.status) filter.status = args.status;
      if (args.type) filter.type = args.type;
      if (args.query) filter.title = { $regex: args.query, $options: "i" };

      const campaigns = await Campaign.find(filter)
        .select("title slug status type totalBudget budgetUsed totalCreators totalSubmissions startDate endDate")
        .sort({ createdAt: -1 })
        .limit(args.limit || 10)
        .lean();

      return { count: campaigns.length, campaigns };
    }

    case "edit_campaign": {
      const filter: Record<string, unknown> = {};
      if (args.campaignId) filter._id = args.campaignId;
      else if (args.slug) filter.slug = args.slug;

      const campaign = await Campaign.findOne(filter);
      if (!campaign) return { error: "Campaign tidak ditemukan" };

      const { updates, reason } = args;
      const allowedFields = ["status", "totalBudget", "ratePerMillionViews"];
      const appliedChanges: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (campaign as any)[field] = updates[field];
          appliedChanges[field] = updates[field];
        }
      }

      await campaign.save();

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: "ai_edit_campaign",
        target: campaign._id.toString(),
        targetType: "campaign",
        details: `AI Assistant mengedit campaign "${campaign.title}": ${JSON.stringify(appliedChanges)}. Alasan: ${reason || "Tidak disebutkan"}`,
      });

      return {
        success: true,
        message: `Campaign "${campaign.title}" berhasil diupdate`,
        changes: appliedChanges,
      };
    }

    case "search_submissions": {
      const filter: Record<string, unknown> = {};
      if (args.status) filter.status = args.status;
      if (args.campaignId) filter.campaignId = args.campaignId;
      if (args.userId) filter.userId = args.userId;

      const submissions = await Submission.find(filter)
        .populate("userId", "username nickname")
        .populate("campaignId", "title")
        .select("videoUrl views likes status earned submittedAt rejectReason")
        .sort({ submittedAt: -1 })
        .limit(args.limit || 10)
        .lean();

      return { count: submissions.length, submissions };
    }

    case "update_submission": {
      const submission = await Submission.findById(args.submissionId);
      if (!submission) return { error: "Submission tidak ditemukan" };

      submission.status = args.action;
      if (args.action === "rejected" && args.rejectReason) {
        submission.rejectReason = args.rejectReason;
      }
      submission.reviewedAt = new Date();
      await submission.save();

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: `ai_${args.action}_submission`,
        target: submission._id.toString(),
        targetType: "submission",
        details: `AI Assistant ${args.action} submission ${args.submissionId}${args.rejectReason ? ". Alasan: " + args.rejectReason : ""}`,
      });

      return {
        success: true,
        message: `Submission berhasil di-${args.action}`,
      };
    }

    case "get_transactions": {
      const filter: Record<string, unknown> = {};
      if (args.userId) filter.userId = args.userId;
      if (args.type) filter.type = args.type;
      if (args.status) filter.status = args.status;

      const transactions = await Transaction.find(filter)
        .populate("userId", "username nickname")
        .sort({ createdAt: -1 })
        .limit(args.limit || 10)
        .lean();

      return { count: transactions.length, transactions };
    }

    case "get_recent_activity": {
      const logs = await ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(args.limit || 10)
        .lean();
      return { count: logs.length, logs };
    }

    case "get_site_settings": {
      let settings = await SiteSetting.findOne().lean();
      if (!settings) {
        settings = (await SiteSetting.create({})).toObject();
      }
      return { success: true, settings };
    }

    case "edit_site_settings": {
      let settings = await SiteSetting.findOne();
      if (!settings) {
        settings = new SiteSetting();
      }
      const updates = args.updates || {};
      Object.assign(settings, updates);
      await settings.save();

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: "ai_edit_site_settings",
        target: settings._id.toString(),
        targetType: "settings",
        details: `AI Assistant mengedit platform settings: ${JSON.stringify(updates)}`,
      });

      return { success: true, message: "Pengaturan situs berhasil disimpan", settings };
    }

    case "get_bot_status": {
      const status = await BotStatus.findOne({ botType: "discord" }).lean();
      if (!status) {
        return { success: true, message: "Bot Discord belum pernah diaktifkan", status: null };
      }
      return { success: true, status };
    }

    case "send_bot_command": {
      const command = args.command;
      if (!["start", "stop", "restart"].includes(command)) {
        return { error: "Perintah bot tidak valid. Gunakan 'start', 'stop', atau 'restart'." };
      }

      let status = await BotStatus.findOne({ botType: "discord" });
      if (!status) {
        status = new BotStatus({ botType: "discord" });
      }

      status.command = command as "start" | "stop" | "restart";
      await status.save();

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: `ai_bot_${command}`,
        target: "discord_bot",
        targetType: "bot",
        details: `AI Assistant mengirim perintah '${command}' ke Bot Discord`,
      });

      return {
        success: true,
        message: `Perintah '${command}' berhasil dikirim ke Bot Discord. Bot akan memprosesnya dalam beberapa detik.`,
        status,
      };
    }

    default:
      return { error: `Tool '${name}' tidak dikenali` };
  }
}

// ─── Main AI Call ────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function runAIChat(
  apiKey: string,
  modelName: string,
  history: ChatMessage[],
  newMessage: string,
  actorId: string,
  actorUsername: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName || "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: tools }],
  });

  const chat = model.startChat({ history });

  let result = await chat.sendMessage(newMessage);
  let response = result.response;

  // Agentic loop: handle function calls
  while (response.functionCalls() && response.functionCalls()!.length > 0) {
    const functionCalls = response.functionCalls()!;
    const toolResults: Part[] = [];

    for (const call of functionCalls) {
      const toolResult = await executeTool(
        call.name,
        call.args as Record<string, unknown>,
        actorId,
        actorUsername
      );
      toolResults.push({
        functionResponse: {
          name: call.name,
          response: toolResult as Record<string, unknown>,
        },
      });
    }

    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  return response.text();
}

// ─── Verify API Key ───────────────────────────────────────────────────────────
export async function verifyGeminiApiKey(apiKey: string, modelName?: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName || "gemini-2.0-flash" });
    const result = await model.generateContent("Say 'OK' in one word.");
    const text = result.response.text();
    if (text) return { valid: true };
    return { valid: false, error: "API tidak memberikan respons" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg };
  }
}

// ─── Get stored API key and Model from DB ────────────────────────────────────
export async function getStoredAIConfig(): Promise<{ apiKey: string | null; model: string }> {
  await connectDB();
  const settings = await SiteSetting.findOne().select("geminiApiKey geminiModel").lean();
  return {
    apiKey: settings?.geminiApiKey || null,
    model: settings?.geminiModel || "gemini-2.0-flash",
  };
}

// Retained for backward compatibility
export async function getStoredApiKey(): Promise<string | null> {
  const config = await getStoredAIConfig();
  return config.apiKey;
}
