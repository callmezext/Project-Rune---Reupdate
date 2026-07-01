import mongoose from "mongoose";
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Part } from "@google/generative-ai";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import Submission from "@/models/Submission";
import Transaction from "@/models/Transaction";
import ActivityLog from "@/models/ActivityLog";
import SiteSetting from "@/models/SiteSetting";
import BotStatus from "@/models/BotStatus";
import ScheduledTask from "@/models/ScheduledTask";

// ─── System Prompt ───────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `You are the AI Admin Assistant for the RuneClipy platform — a TikTok creator marketing platform.
You help the admin manage the platform efficiently with high-level intelligence, analytical sharpness, and reasoning equivalent to Gemini 3.5 Pro / Claude 3.5 Sonnet.

Your capabilities:
- Search and analyze user, campaign, submission, transaction, platform setting, activity log, and Discord Server (channels, roles, members) data
- Edit user data (role, tier, balance, ban/unban)
- Manage campaigns (create new campaigns, duplicate campaigns, view details, edit status, budget, rates)
- Approve/reject video submissions
- Process user payouts/withdrawals (approve or reject payouts)
- View and modify platform settings (platform fee, minimum withdrawal, etc.)
- Monitor bot status and control the Discord Bot (start, stop, restart)
- Interact fully with the Discord server:
  * Get list of active text channels in the Discord server ('get_discord_channels')
  * Send custom text messages directly to a specific Discord channel ('send_discord_message')
  * Get list of all roles in the Discord guild ('get_discord_roles')
  * Add or remove Discord roles of a member directly based on platform username/user ID ('manage_member_role')
- Schedule automated future tasks, such as sending a Discord message at a specific time ('schedule_task')
- Analyze statistics, financial performance, proactively detect data anomalies/fraud, and provide tactical business insights

High-Level Tone & Behavior Guidelines (Claude-Level / Gemini 3.5-Level):
1. RIGOROUS & LOGICAL REASONING: Think deeply, critically, strategically, and analytically. Perform step-by-step analysis before concluding data. If you detect anomalies (e.g. user with a high tier but low views, or unrealistic video submissions), report to the admin and proactively suggest mitigation solutions.
2. TO THE POINT: Provide responses that directly address the core issue, concise, dense, professional, and of high value. REMOVE pleasantries, overly casual greetings, or useless intro/outro sentences.
3. MANDATORY CONFIRMATION PROCEDURE (BEFORE EXECUTION): For all data modifying, sensitive, or dangerous actions (such as 'edit_user', 'edit_campaign', 'create_campaign', 'duplicate_campaign', 'update_submission', 'process_payout', 'edit_site_settings', 'send_bot_command', 'send_discord_message', 'manage_member_role', 'schedule_task'):
   - You MUST NOT immediately call/execute the tool on the admin's first request.
   - You must answer first to-the-point: state what action will be taken, its parameters, its brief impact, and ask for explicit confirmation from the admin (e.g. 'I will process a payout of $50.00 for user @guntur to Completed. Are you sure? Answer Yes or No').
   - Only after the admin replies 'Yes', 'Yes, please', or similar explicit approval in the next message, you are allowed to call the corresponding tool.
   - DO NOT call data-modifying tools before the admin confirms 'Yes' in the message history!
4. Present data using clean Markdown formatting (lists, tables where relevant).

Platform context:
- User tiers: bronze, silver, gold, diamond
- User roles: user, moderator, admin  
- Campaign status: active, paused, ended
- Submission status: pending, approved, rejected, paid_out
- Payout transaction status: pending, completed, failed, rejected
- Currency: USD ($)`;

// ─── Function Declarations (Tools) ────────────────────────────────────────────
export const tools: FunctionDeclaration[] = [
  {
    name: "search_users",
    description: "Search users by username, email, role, tier, or ban status. Use to find a specific user.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Search keyword (username or email)" },
        role: { type: SchemaType.STRING, description: "Filter by role: user, moderator, admin" },
        tier: { type: SchemaType.STRING, description: "Filter by tier: bronze, silver, gold, diamond" },
        isBanned: { type: SchemaType.BOOLEAN, description: "Filter users who are banned (true) or not (false)" },
        limit: { type: SchemaType.NUMBER, description: "Maximum number of results (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_user_detail",
    description: "Get complete details of a user by ID or username, including stats and balance.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the user" },
        username: { type: SchemaType.STRING, description: "Username of the user" },
      },
      required: [],
    },
  },
  {
    name: "edit_user",
    description: "Edit user data: role, tier, campaign balance, referral balance, ban/unban. CANNOT delete.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the user to edit" },
        username: { type: SchemaType.STRING, description: "Username of the user (alternative to userId)" },
        updates: {
          type: SchemaType.OBJECT,
          description: "Data to modify",
          properties: {
            role: { type: SchemaType.STRING, description: "New role: user, moderator, admin" },
            tier: { type: SchemaType.STRING, description: "New tier: bronze, silver, gold, diamond" },
            campaignBalance: { type: SchemaType.NUMBER, description: "New campaign balance (USD)" },
            referralBalance: { type: SchemaType.NUMBER, description: "New referral balance (USD)" },
            isBanned: { type: SchemaType.BOOLEAN, description: "true to ban, false to unban" },
          },
        },
        reason: { type: SchemaType.STRING, description: "Reason for change for the audit log" },
      },
      required: ["updates"],
    },
  },
  {
    name: "get_platform_stats",
    description: "Get platform statistics: total users, revenue, active campaigns, pending submissions, etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_campaigns",
    description: "Search campaigns by title, status, or type.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Campaign title keyword" },
        status: { type: SchemaType.STRING, description: "Filter status: active, paused, ended" },
        type: { type: SchemaType.STRING, description: "Filter type: music, clipping, logo, ugc" },
        limit: { type: SchemaType.NUMBER, description: "Maximum number of results (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "edit_campaign",
    description: "Edit campaign: change status (active/paused/ended), budget, or rate.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        campaignId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the campaign" },
        slug: { type: SchemaType.STRING, description: "Campaign slug (alternative to campaignId)" },
        updates: {
          type: SchemaType.OBJECT,
          description: "Data to modify",
          properties: {
            status: { type: SchemaType.STRING, description: "New status: active, paused, ended" },
            totalBudget: { type: SchemaType.NUMBER, description: "New total budget (USD)" },
            ratePerMillionViews: { type: SchemaType.NUMBER, description: "New rate per 1M views (USD)" },
          },
        },
        reason: { type: SchemaType.STRING, description: "Reason for change" },
      },
      required: ["updates"],
    },
  },
  {
    name: "search_submissions",
    description: "Search submissions by status, campaign, or user.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Filter status: pending, approved, rejected, paid_out" },
        campaignId: { type: SchemaType.STRING, description: "Filter by campaign ID" },
        userId: { type: SchemaType.STRING, description: "Filter by user ID" },
        limit: { type: SchemaType.NUMBER, description: "Maximum number of results (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "update_submission",
    description: "Approve or reject a submission.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        submissionId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the submission" },
        action: { type: SchemaType.STRING, description: "Action: approved or rejected" },
        rejectReason: { type: SchemaType.STRING, description: "Reason for rejection (required if action=rejected)" },
      },
      required: ["submissionId", "action"],
    },
  },
  {
    name: "get_transactions",
    description: "Get transaction list with optional filters.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "Filter by user ID" },
        type: { type: SchemaType.STRING, description: "Filter type: campaign_earning, referral_earning, payout, refund" },
        status: { type: SchemaType.STRING, description: "Filter status: pending, completed, failed, rejected" },
        limit: { type: SchemaType.NUMBER, description: "Maximum number of results (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_recent_activity",
    description: "Get recent admin activity logs.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Maximum number of results (default: 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_site_settings",
    description: "Get site/platform settings (platform fee, minimum withdrawal, support email, etc.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "edit_site_settings",
    description: "Modify site/platform settings (such as platformFeePercent, minCampaignWithdrawal, minReferralWithdrawal, referralCommissionPercent, supportEmail).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        updates: {
          type: SchemaType.OBJECT,
          description: "New settings to save",
          properties: {
            platformFeePercent: { type: SchemaType.NUMBER, description: "Platform fee in percent (e.g. 3)" },
            minCampaignWithdrawal: { type: SchemaType.NUMBER, description: "Minimum campaign withdrawal in USD" },
            minReferralWithdrawal: { type: SchemaType.NUMBER, description: "Minimum referral withdrawal in USD" },
            referralCommissionPercent: { type: SchemaType.NUMBER, description: "Referral commission in percent (e.g. 5)" },
            supportEmail: { type: SchemaType.STRING, description: "New support email" },
          },
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "get_bot_status",
    description: "Get Discord Bot status and statistics (online, ping, server count, heartbeat).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_discord_channels",
    description: "Get active text channels list from Discord guild/RuneClipy.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "send_discord_message",
    description: "Send a custom text message to a specific Discord channel using Discord Bot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        channelId: { type: SchemaType.STRING, description: "Target Discord channel ID" },
        content: { type: SchemaType.STRING, description: "Text message to send" },
      },
      required: ["channelId", "content"],
    },
  },
  {
    name: "get_discord_roles",
    description: "Get list of all active roles and their IDs in the Discord guild/RuneClipy server.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "manage_member_role",
    description: "Add or remove Discord roles of a member based on username/user ID on the platform.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the user on the platform (optional)" },
        username: { type: SchemaType.STRING, description: "Username of the user on the platform (optional)" },
        roleId: { type: SchemaType.STRING, description: "Discord role ID to manage" },
        action: { type: SchemaType.STRING, description: "Action: add (add role) or remove (remove role)" },
      },
      required: ["roleId", "action"],
    },
  },
  {
    name: "schedule_task",
    description: "Schedule an automated task in the future, such as sending a Discord message.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        taskType: {
          type: SchemaType.STRING,
          description: "Type of task scheduled. Currently only supports: 'send_discord_message'",
        },
        payload: {
          type: SchemaType.OBJECT,
          description: "Payload required for the task. For 'send_discord_message', it must contain { channelId, content }",
          properties: {
            channelId: { type: SchemaType.STRING, description: "Target Discord channel ID" },
            content: { type: SchemaType.STRING, description: "Text message to send" },
          },
          required: ["channelId", "content"],
        },
        executeAt: {
          type: SchemaType.STRING,
          description: "Task execution time as an ISO date string (ISO 8601 string, e.g., '2026-05-24T10:00:00Z')",
        },
      },
      required: ["taskType", "payload", "executeAt"],
    },
  },
  {
    name: "create_campaign",
    description: "Create a new campaign for the platform.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Campaign title" },
        type: { type: SchemaType.STRING, description: "Campaign type: music, clipping, logo, ugc" },
        totalBudget: { type: SchemaType.NUMBER, description: "Total campaign budget (USD)" },
        ratePerMillionViews: { type: SchemaType.NUMBER, description: "Rate per 1M views (USD, default: 1000)" },
        description: { type: SchemaType.STRING, description: "Campaign description (optional, HTML or plain text)" },
        coverImage: { type: SchemaType.STRING, description: "Cover image URL (optional)" },
        soundTitle: { type: SchemaType.STRING, description: "Song/sound title (optional)" },
        tiktokSoundId: { type: SchemaType.STRING, description: "TikTok Sound ID (optional)" },
        soundUrl: { type: SchemaType.STRING, description: "Song/sound URL on TikTok (optional)" },
      },
      required: ["title", "type", "totalBudget", "ratePerMillionViews"],
    },
  },
  {
    name: "process_payout",
    description: "Process a payout request (balance withdrawal) from a user, either approved (completed) or rejected (rejected).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        transactionId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the payout transaction" },
        action: { type: SchemaType.STRING, description: "Action: completed (approve/complete) or rejected (reject)" },
        note: { type: SchemaType.STRING, description: "Note or reason (especially if rejected)" },
      },
      required: ["transactionId", "action"],
    },
  },
  {
    name: "get_campaign_detail",
    description: "Get complete details of a campaign by ID or slug.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        campaignId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the campaign" },
        slug: { type: SchemaType.STRING, description: "Campaign slug" },
      },
      required: [],
    },
  },
  {
    name: "duplicate_campaign",
    description: "Duplicate an existing campaign to create a new campaign with the same settings.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        campaignId: { type: SchemaType.STRING, description: "MongoDB ObjectId of the campaign to duplicate" },
        slug: { type: SchemaType.STRING, description: "Slug of the campaign to duplicate (alternative)" },
        newTitle: { type: SchemaType.STRING, description: "New title for the duplicated campaign (optional)" },
        newBudget: { type: SchemaType.NUMBER, description: "New budget for the duplicated campaign (optional)" },
      },
      required: [],
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
      if (!user) return { error: "User not found" };
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
        details: `AI Assistant edited user @${user.username}: ${JSON.stringify(appliedChanges)}. Reason: ${reason || "Not specified"}`,
      });

      return {
        success: true,
        message: `User @${user.username} successfully updated`,
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
      if (!campaign) return { error: "Campaign not found" };

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
        details: `AI Assistant edited campaign "${campaign.title}": ${JSON.stringify(appliedChanges)}. Reason: ${reason || "Not specified"}`,
      });

      return {
        success: true,
        message: `Campaign "${campaign.title}" successfully updated`,
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
      if (!submission) return { error: "Submission not found" };

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
        details: `AI Assistant ${args.action} submission ${args.submissionId}${args.rejectReason ? ". Reason: " + args.rejectReason : ""}`,
      });

      return {
        success: true,
        message: `Submission successfully ${args.action}d`,
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
        details: `AI Assistant edited platform settings: ${JSON.stringify(updates)}`,
      });

      return { success: true, message: "Site settings successfully saved", settings };
    }

    case "get_bot_status": {
      const status = await BotStatus.findOne({ botType: "discord" }).lean();
      if (!status) {
        return { success: true, message: "Discord Bot has never been activated", status: null };
      }
      return { success: true, status };
    }

    case "send_bot_command": {
      const command = args.command;
      if (!["start", "stop", "restart"].includes(command)) {
        return { error: "Invalid bot command. Use 'start', 'stop', or 'restart'." };
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
        details: `AI Assistant sent command '${command}' to Discord Bot`,
      });

      return {
        success: true,
        message: `Command '${command}' successfully sent to Discord Bot. The bot will process it in a few seconds.`,
        status,
      };
    }

    case "get_discord_channels": {
      const settings = await SiteSetting.findOne().lean();
      const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
      const guildId = settings?.discordGuildId || process.env.DISCORD_GUILD_ID || "";

      if (!token || !guildId) {
        return { error: "Discord Bot token or Guild ID has not been configured in settings." };
      }

      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `Failed to get channels from Discord: ${err}` };
      }

      const channels = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textChannels = (channels as any[])
        .filter((c) => c.type === 0)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({ id: c.id, name: c.name }));

      return { success: true, count: textChannels.length, channels: textChannels };
    }

    case "send_discord_message": {
      const settings = await SiteSetting.findOne().lean();
      const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
      const channelId = args.channelId;
      const content = args.content;

      if (!token) return { error: "Discord Bot token has not been configured in settings." };
      if (!channelId || !content) return { error: "channelId and content are required." };

      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `Failed to send message to Discord: ${err}` };
      }

      const msg = await res.json();
      return { success: true, messageId: msg.id, message: "Message successfully sent to Discord!" };
    }

    case "get_discord_roles": {
      const settings = await SiteSetting.findOne().lean();
      const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
      const guildId = settings?.discordGuildId || process.env.DISCORD_GUILD_ID || "";

      if (!token || !guildId) {
        return { error: "Discord Bot token or Guild ID has not been configured." };
      }

      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `Failed to get roles from Discord: ${err}` };
      }

      const roles = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedRoles = (roles as any[])
        .filter((r) => r.name !== "@everyone" && !r.managed)
        .map((r) => ({ id: r.id, name: r.name, color: r.color }));

      return { success: true, count: mappedRoles.length, roles: mappedRoles };
    }

    case "manage_member_role": {
      const settings = await SiteSetting.findOne().lean();
      const token = settings?.discordBotToken || process.env.DISCORD_BOT_TOKEN || "";
      const guildId = settings?.discordGuildId || process.env.DISCORD_GUILD_ID || "";

      if (!token || !guildId) {
        return { error: "Discord Bot token or Guild ID has not been configured." };
      }

      let user = null;
      if (args.userId) {
        user = await User.findById(args.userId);
      } else if (args.username) {
        user = await User.findOne({ username: args.username.toLowerCase() });
      }

      if (!user) {
        return { error: "User on RuneClipy platform not found." };
      }

      const discordUserId = user.discordId;
      if (!discordUserId) {
        return { error: `User @${user.username} has not linked their Discord account on the platform.` };
      }

      const roleId = args.roleId;
      const action = args.action; // "add" or "remove"

      if (!["add", "remove"].includes(action)) {
        return { error: "Invalid action. Use 'add' or 'remove'." };
      }

      const url = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
      const method = action === "add" ? "PUT" : "DELETE";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bot ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return { error: `Failed to ${action === "add" ? "add" : "remove"} role in Discord: ${err}` };
      }

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: `ai_discord_role_${action}`,
        target: user._id.toString(),
        targetType: "user",
        details: `AI Assistant ${action === "add" ? "added" : "removed"} Discord role (ID: ${roleId}) for user @${user.username}`,
      });

      return {
        success: true,
        message: `Discord role successfully ${action === "add" ? "added to" : "removed from"} user @${user.username}!`,
      };
    }

    case "schedule_task": {
      const { taskType, payload, executeAt } = args;

      if (taskType !== "send_discord_message") {
        return { error: "Task type not supported. Only supports 'send_discord_message' currently." };
      }

      const executeDate = new Date(executeAt);
      if (isNaN(executeDate.getTime())) {
        return { error: "Invalid executeAt time format. Must be an ISO 8601 string." };
      }

      if (executeDate <= new Date()) {
        return { error: "Execution time must be in the future." };
      }

      const task = await ScheduledTask.create({
        taskType,
        payload,
        executeAt: executeDate,
        status: "pending",
      });

      // Log activity
      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: "ai_schedule_task",
        target: task._id.toString(),
        targetType: "task",
        details: `AI Assistant scheduled task '${taskType}' to be executed at ${executeDate.toISOString()}`,
      });

      return {
        success: true,
        taskId: task._id.toString(),
        message: `Task '${taskType}' successfully scheduled at ${executeDate.toLocaleString()}`,
        task,
      };
    }

    case "create_campaign": {
      const { title, type, totalBudget, ratePerMillionViews, description, coverImage, soundTitle, tiktokSoundId, soundUrl } = args;

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const existing = await Campaign.findOne({ slug });
      const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

      const campaignData: any = {
        title,
        slug: finalSlug,
        type,
        totalBudget,
        ratePerMillionViews,
        description: description || `Campaign ${title}`,
        coverImage: coverImage || "",
        createdBy: new mongoose.Types.ObjectId(actorId),
        status: "active",
      };

      if (soundTitle || tiktokSoundId || soundUrl) {
        campaignData.sounds = [{
          title: soundTitle || title,
          tiktokSoundId: tiktokSoundId || "",
          soundUrl: soundUrl || "",
          videoReferenceUrl: "",
        }];
      }

      const campaign = await Campaign.create(campaignData);

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: "ai_create_campaign",
        target: campaign._id.toString(),
        targetType: "campaign",
        details: `AI Assistant created a new campaign: "${title}" (Slug: ${finalSlug}) with budget $${totalBudget}`,
      });

      return {
        success: true,
        message: `Campaign "${title}" successfully created!`,
        campaign: {
          id: campaign._id.toString(),
          slug: campaign.slug,
          status: campaign.status,
        },
      };
    }

    case "process_payout": {
      const { transactionId, action, note } = args;

      if (!["completed", "rejected"].includes(action)) {
        return { error: "Invalid action. Use 'completed' or 'rejected'." };
      }

      const tx = await Transaction.findById(transactionId);
      if (!tx) return { error: "Transaction not found" };
      if (tx.type !== "payout") return { error: "This transaction is not a payout transaction" };
      if (tx.status !== "pending") return { error: `This transaction has already been processed with status: ${tx.status}` };

      tx.status = action;
      if (action === "completed") tx.processedAt = new Date();
      await tx.save();

      const { createNotification } = await import("@/lib/notifications");

      if (action === "rejected") {
        const balanceField = tx.description?.includes("referral") ? "referralBalance" : "campaignBalance";
        await User.findByIdAndUpdate(tx.userId, { $inc: { [balanceField]: tx.amount } });

        await createNotification({
          userId: tx.userId.toString(),
          type: "payout_rejected",
          title: "Payout Rejected",
          message: `Your payout of $${tx.amount.toFixed(2)} was rejected. The amount has been refunded to your balance.${note ? " Reason: " + note : ""}`,
          link: "/balance",
        });
      }

      if (action === "completed") {
        await createNotification({
          userId: tx.userId.toString(),
          type: "payout_completed",
          title: "Payout Sent! 💸",
          message: `Your payout of $${tx.netAmount.toFixed(2)} has been processed and sent to your payment method.${note ? " Note: " + note : ""}`,
          link: "/balance",
        });
      }

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: `ai_process_payout_${action}`,
        target: tx._id.toString(),
        targetType: "transaction",
        details: `AI Assistant processed payout ${transactionId} to ${action}. Note: ${note || "-"}`,
      });

      return {
        success: true,
        message: `Payout with ID ${transactionId} successfully updated to ${action}!`,
      };
    }

    case "get_campaign_detail": {
      const filter: Record<string, unknown> = {};
      if (args.campaignId) filter._id = args.campaignId;
      else if (args.slug) filter.slug = args.slug;
      else return { error: "campaignId or slug is required." };

      const campaign = await Campaign.findOne(filter).lean();
      if (!campaign) return { error: "Campaign not found" };
      return { success: true, campaign };
    }

    case "duplicate_campaign": {
      const filter: Record<string, unknown> = {};
      if (args.campaignId) filter._id = args.campaignId;
      else if (args.slug) filter.slug = args.slug;
      else return { error: "campaignId or slug is required." };

      const original = await Campaign.findOne(filter);
      if (!original) return { error: "Original campaign not found." };

      const title = args.newTitle || `${original.title} (Copy)`;
      const totalBudget = args.newBudget !== undefined ? args.newBudget : original.totalBudget;

      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const existing = await Campaign.findOne({ slug: baseSlug });
      const finalSlug = existing ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, createdAt, updatedAt, ...copyData } = original.toObject();
      
      copyData.title = title;
      copyData.slug = finalSlug;
      copyData.totalBudget = totalBudget;
      copyData.budgetUsed = 0;
      copyData.totalCreators = 0;
      copyData.totalSubmissions = 0;
      copyData.budgetAlertSent = false;
      copyData.status = "active";
      copyData.createdBy = new mongoose.Types.ObjectId(actorId);
      copyData.startDate = new Date();

      const campaign = await Campaign.create(copyData);

      await ActivityLog.create({
        actor: actorUsername,
        actorId,
        action: "ai_duplicate_campaign",
        target: campaign._id.toString(),
        targetType: "campaign",
        details: `AI Assistant duplicated campaign "${original.title}" to "${title}" (Slug: ${finalSlug}) with budget $${totalBudget}`,
      });

      return {
        success: true,
        message: `Campaign "${original.title}" successfully duplicated to "${title}"!`,
        campaign: {
          id: campaign._id.toString(),
          slug: campaign.slug,
          status: campaign.status,
        },
      };
    }

    default:
      return { error: `Tool '${name}' not recognized` };
  }
}

// ─── Main AI Call ────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function runAIChat(
  apiKeys: string | string[],
  modelName: string,
  history: ChatMessage[],
  newMessage: string,
  actorId: string,
  actorUsername: string
): Promise<string> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  const activeKeys = keys.filter(k => k && k.trim().length > 0);

  if (activeKeys.length === 0) {
    throw new Error("Gemini API key is not available. Please configure it in Settings.");
  }

  let lastError: any = null;

  for (let i = 0; i < activeKeys.length; i++) {
    const currentKey = activeKeys[i];
    
    // Build list of models to try in fallback order
    const modelsToTry = [modelName || "gemini-2.5-flash"];
    if (modelName && modelName !== "gemini-2.5-flash") {
      modelsToTry.push("gemini-2.5-flash");
    }
    if (modelName !== "gemini-2.0-flash") {
      modelsToTry.push("gemini-2.0-flash");
    }
    if (modelName !== "gemini-1.5-flash") {
      modelsToTry.push("gemini-1.5-flash");
    }

    for (const currentModel of modelsToTry) {
      try {
        console.log(`[AI Chat] Trying model ${currentModel} with API key index ${i}`);
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({
          model: currentModel,
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
      } catch (error: any) {
        console.error(`[AI Chat] Failed to use model ${currentModel} with key ${i}:`, error);
        lastError = error;

        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorMsgLower = errorMsg.toLowerCase();

        // 503, 500, or 404 indicates a model-specific issue -> try next model on same key
        const isModelIssue = 
          errorMsg.includes("503") || 
          errorMsg.includes("500") || 
          errorMsg.includes("404") ||
          errorMsgLower.includes("service unavailable") ||
          errorMsgLower.includes("model not found") ||
          errorMsgLower.includes("not found");

        if (isModelIssue) {
          console.warn(`[AI Chat] Model ${currentModel} has issues (Spikes/503/Offline). Trying next fallback model...`);
          continue;
        }

        // For quota/key issues (429, invalid key), break model loop to try the next API key
        const isQuotaOrKeyError =
          errorMsg.includes("429") ||
          errorMsgLower.includes("quota") ||
          errorMsgLower.includes("resourceexhausted") ||
          errorMsgLower.includes("limit") ||
          errorMsgLower.includes("api key") ||
          errorMsgLower.includes("key not valid") ||
          errorMsgLower.includes("unauthorized") ||
          errorMsg.includes("403");

        if (isQuotaOrKeyError) {
          console.warn(`[AI Chat] Key index ${i} has issues or is out of quota. Trying next API key...`);
          break;
        }

        // Otherwise try the next model fallback
        console.warn(`[AI Chat] Another error occurred on model ${currentModel}. Trying next fallback model...`);
        continue;
      }
    }
  }

  throw lastError || new Error("All configured Gemini API keys failed or ran out of quota.");
}

// ─── Verify API Key ───────────────────────────────────────────────────────────
export async function verifyGeminiApiKey(apiKey: string, modelName?: string): Promise<{ valid: boolean; error?: string }> {
  const modelsToTry = [modelName || "gemini-2.5-flash"];
  if (modelName && modelName !== "gemini-2.5-flash") {
    modelsToTry.push("gemini-2.5-flash");
  }
  if (modelName !== "gemini-2.0-flash") {
    modelsToTry.push("gemini-2.0-flash");
  }
  if (modelName !== "gemini-1.5-flash") {
    modelsToTry.push("gemini-1.5-flash");
  }

  let lastErrorMsg = "";
  for (const currentModel of modelsToTry) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: currentModel });
      const result = await model.generateContent("Say 'OK' in one word.");
      const text = result.response.text();
      if (text) return { valid: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI Verify] Model ${currentModel} failed: ${msg}`);
      lastErrorMsg = msg;
      
      // If it's a structural API key issue (not a model outage), fail immediately
      if (msg.includes("API key") || msg.toLowerCase().includes("key not valid") || msg.toLowerCase().includes("invalid") || msg.includes("400")) {
        break;
      }
    }
  }
  return { valid: false, error: lastErrorMsg || "API did not respond" };
}

// ─── Get stored API key and Model from DB ────────────────────────────────────
export async function getStoredAIConfig(): Promise<{ apiKey: string | null; apiKeys: string[]; model: string }> {
  await connectDB();
  const settings = await SiteSetting.findOne().select("geminiApiKey geminiApiKeys geminiModel").lean();
  let keys: string[] = [];
  if (settings?.geminiApiKeys && settings.geminiApiKeys.length > 0) {
    keys = settings.geminiApiKeys.filter((k: string) => k && k.trim().length > 0);
  }
  if (keys.length === 0 && settings?.geminiApiKey) {
    keys = [settings.geminiApiKey];
  }
  return {
    apiKey: settings?.geminiApiKey || null,
    apiKeys: keys,
    model: settings?.geminiModel || "gemini-2.5-flash",
  };
}

// Retained for backward compatibility
export async function getStoredApiKey(): Promise<string | null> {
  const config = await getStoredAIConfig();
  return config.apiKey;
}
