/**
 * RuneClipy Discord Bot v4 — Full Feature Suite
 * User Commands: help, stats, info, campaigns, submit, campaign-stats, profile, leaderboard, balance, referral, campaign-detail, link
 * Mod Commands: mod-review, mod-approve, mod-reject, mod-stats (hidden from users)
 * Admin Commands: daily-stats (hidden from users)
 * Auto Systems: campaign notif, submission DM, role sync, welcome DM
 */
const {
  Client, GatewayIntentBits, Events, ActivityType, PermissionFlagsBits,
  REST, Routes, SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require("discord.js");
const mongoose = require("mongoose");
try { require("dotenv").config(); } catch {}

const MONGODB_URI = process.env.MONGODB_URI || "";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1501176219255963778";
const POLL_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 10000;
const AUTO_CHECK_INTERVAL = 30000; // 30s for auto-notif checks

if (!MONGODB_URI) { console.error("❌ MONGODB_URI required"); process.exit(1); }
if (!BOT_TOKEN) { console.error("❌ DISCORD_BOT_TOKEN required"); process.exit(1); }

// ─── Schemas ─────────────────────────────────────────────
const BotStatusSchema = new mongoose.Schema({
  botType: { type: String, default: "discord", unique: true },
  command: { type: String, enum: ["start","stop","restart","idle"], default: "idle" },
  status: { type: String, enum: ["offline","connecting","online","error"], default: "offline" },
  error: String, username: String, avatar: String,
  guildCount: Number, ping: Number, startedAt: Date, lastHeartbeat: Date,
}, { timestamps: true });

const SiteSettingSchema = new mongoose.Schema({
  discordGuildId: String, discordNotifChannelId: String,
}, { timestamps: true, strict: false });

const CampaignSchema = new mongoose.Schema({
  title: String, description: String, soundUrl: String,
  ratePerView: Number, budget: Number, spent: Number,
  status: { type: String, enum: ["active","completed","paused","draft"] },
  deadline: Date, minViews: Number, maxSubmissions: Number,
  imageUrl: String, notifiedDiscord: { type: Boolean, default: false },
}, { timestamps: true, strict: false });

const SubmissionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  campaignId: mongoose.Schema.Types.ObjectId,
  videoUrl: String,
  status: { type: String, enum: ["pending","approved","rejected","recheck"], default: "pending" },
  views: Number, earned: Number,
  dmNotified: { type: Boolean, default: false },
}, { timestamps: true, strict: false });

const UserSchema = new mongoose.Schema({
  username: String, nickname: String, email: String,
  discordId: String, discordUsername: String,
  role: { type: String, enum: ["user","moderator","admin"], default: "user" },
  tier: String, isBanned: Boolean,
  stats: { totalVideos: Number, totalEarned: Number, totalViews: Number },
  campaignBalance: Number, referralBalance: Number,
  badges: [String], referralCode: String,
  lastTierSynced: String,
}, { timestamps: true, strict: false });

const ConnectedAccountSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  tiktokUsername: String, isVerified: Boolean,
}, { timestamps: true, strict: false });

const TransactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: { type: String, enum: ["campaign_earning","referral_earning","payout","refund"] },
  amount: Number, status: String, description: String,
  netAmount: Number,
}, { timestamps: true, strict: false });

const ReferralSchema = new mongoose.Schema({
  referrerId: mongoose.Schema.Types.ObjectId,
  referredUserId: mongoose.Schema.Types.ObjectId,
  referredUsername: String, referrerUsername: String,
  totalEarned: Number,
}, { timestamps: true, strict: false });

const LinkTokenSchema = new mongoose.Schema({
  token: { type: String, unique: true },
  discordId: String, discordUsername: String,
  used: { type: Boolean, default: false },
  expiresAt: Date,
}, { timestamps: true });

const ActivityLogSchema = new mongoose.Schema({
  actor: String,
  actorId: String,
  action: String,
  target: String,
  targetType: String,
  details: String,
  metadata: mongoose.Schema.Types.Mixed,
  ip: String,
  notifiedMatrix: { type: Boolean, default: false },
}, { timestamps: true, strict: false });

const BotStatus = mongoose.models.BotStatus || mongoose.model("BotStatus", BotStatusSchema, "botstatuses");
const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", SiteSettingSchema, "sitesettings");
const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema, "campaigns");
const Submission = mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema, "submissions");
const User = mongoose.models.User || mongoose.model("User", UserSchema, "users");
const ConnectedAccount = mongoose.models.ConnectedAccount || mongoose.model("ConnectedAccount", ConnectedAccountSchema, "connectedaccounts");
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema, "transactions");
const Referral = mongoose.models.Referral || mongoose.model("Referral", ReferralSchema, "referrals");
const LinkToken = mongoose.models.LinkToken || mongoose.model("LinkToken", LinkTokenSchema, "linktokens");
const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema, "activitylogs");

async function getGuildId() {
  const s = await SiteSetting.findOne().lean();
  return s?.discordGuildId || process.env.DISCORD_GUILD_ID || "";
}

// ─── Commands ────────────────────────────────────────────
const userCommands = [
  new SlashCommandBuilder().setName("help").setDescription("📖 Tampilkan daftar commands"),
  new SlashCommandBuilder().setName("stats").setDescription("📊 Statistik bot & latency"),
  new SlashCommandBuilder().setName("info").setDescription("🔮 Informasi tentang RuneClipy"),
  new SlashCommandBuilder().setName("campaigns").setDescription("🎵 Campaign aktif"),
  new SlashCommandBuilder().setName("submit").setDescription("📤 Submit video ke campaign"),
  new SlashCommandBuilder().setName("campaign-stats").setDescription("📋 Status submission kamu"),
  new SlashCommandBuilder().setName("profile").setDescription("👤 Profil RuneClipy kamu"),
  new SlashCommandBuilder().setName("leaderboard").setDescription("🏆 Top 10 creator"),
  new SlashCommandBuilder().setName("balance").setDescription("💰 Cek saldo & riwayat withdrawal"),
  new SlashCommandBuilder().setName("referral").setDescription("🔗 Kode referral & stats"),
  new SlashCommandBuilder().setName("campaign-detail").setDescription("📋 Detail campaign spesifik"),
  new SlashCommandBuilder().setName("link").setDescription("🔗 Hubungkan akun Discord ke RuneClipy"),
];

const modCommands = [
  new SlashCommandBuilder().setName("mod-review").setDescription("🛡️ Review pending submissions")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName("mod-approve").setDescription("✅ Approve submission")
    .addStringOption(o => o.setName("id").setDescription("Submission ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName("mod-reject").setDescription("❌ Reject submission")
    .addStringOption(o => o.setName("id").setDescription("Submission ID").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Alasan reject").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName("mod-stats").setDescription("📊 Statistik moderasi")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
];

const adminCommands = [
  new SlashCommandBuilder().setName("daily-stats").setDescription("📈 Statistik hari ini (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

const allCommands = [...userCommands, ...modCommands, ...adminCommands];

// ─── Register Commands ───────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  const data = allCommands.map(c => c.toJSON());
  const guildId = await getGuildId();

  if (guildId) {
    try {
      const r = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: data });
      console.log(`[Bot] ✅ ${r.length} commands → guild ${guildId}`);
    } catch (e) { console.error("[Bot] ❌ Guild reg:", e.message); }
  }
  if (client) {
    for (const [id, g] of client.guilds.cache) {
      if (id === guildId) continue;
      try { await rest.put(Routes.applicationGuildCommands(CLIENT_ID, id), { body: data }); console.log(`[Bot] ✅ → ${g.name}`); }
      catch (e) { console.error(`[Bot] ⚠️ ${g.name}:`, e.message); }
    }
  }
  try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] }); } catch {}
}

const TIER_EMOJI = { bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎" };
const TIER_ROLES = {
  bronze: { name: "🥉 Bronze Creator", color: 0xCD7F32 },
  silver: { name: "🥈 Silver Creator", color: 0xC0C0C0 },
  gold:   { name: "🥇 Gold Creator",   color: 0xFFD700 },
  diamond: { name: "💎 Diamond Creator", color: 0xB9F2FF },
};

function fmt(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n||0); }
function fmtCurrency(n) { return "$" + Number(n||0).toFixed(2); }
function fmtUptime(ms) {
  const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24);
  if(d>0) return `${d}d ${h%24}h`; if(h>0) return `${h}h ${m%60}m`; return `${m}m ${s%60}s`;
}

// ─── Permission Check ────────────────────────────────────
async function isMod(discordId) {
  const u = await User.findOne({ discordId }).lean();
  return u && (u.role === "moderator" || u.role === "admin");
}
async function isAdmin(discordId) {
  const u = await User.findOne({ discordId }).lean();
  return u && u.role === "admin";
}

// ─── Interaction Handler ─────────────────────────────────
async function handleInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isStringSelectMenu()) await handleSelect(interaction);
    else if (interaction.isModalSubmit()) await handleModal(interaction);
    else if (interaction.isButton()) await handleButton(interaction);
  } catch (err) {
    console.error(`[Bot] Interaction error:`, err.message);
    const reply = { content: "❌ Terjadi error, coba lagi.", ephemeral: true };
    try { if (interaction.replied||interaction.deferred) await interaction.followUp(reply); else await interaction.reply(reply); } catch {}
  }
}

// ─── Command Handler ─────────────────────────────────────
async function handleCommand(interaction) {
  const { commandName } = interaction;

  // ═══ /help ═══
  if (commandName === "help") {
    const e = new EmbedBuilder().setColor(0x00D4AA).setTitle("🔮 RuneClipy Bot v4")
      .setDescription("Semua commands yang tersedia:")
      .addFields(
        { name: "📖 General", value: "`/help` `/stats` `/info`" },
        { name: "🎵 Campaigns", value: "`/campaigns` `/campaign-detail` `/submit` `/campaign-stats`" },
        { name: "👤 Profile", value: "`/profile` `/balance` `/referral` `/link`" },
        { name: "🏆 Community", value: "`/leaderboard`" },
      ).setFooter({ text: "RuneClipy 🔮 | v4" }).setTimestamp();
    return interaction.reply({ embeds: [e] });
  }

  // ═══ /stats ═══
  if (commandName === "stats") {
    const sent = Date.now();
    await interaction.reply({ content: "📊 Loading..." });
    const latency = Date.now() - sent;
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a,g) => a+g.memberCount, 0);
    const e = new EmbedBuilder().setColor(0xFF6B6B).setTitle("📊 Bot Statistics")
      .addFields(
        { name: "📡 Latency", value: `\`${latency}ms\``, inline: true },
        { name: "💓 API", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
        { name: "⏱️ Uptime", value: `\`${fmtUptime(client.uptime)}\``, inline: true },
        { name: "🖥️ Servers", value: `\`${guilds}\``, inline: true },
        { name: "👥 Users", value: `\`${fmt(users)}\``, inline: true },
        { name: "📦 Node", value: `\`${process.version}\``, inline: true },
      ).setFooter({ text: "RuneClipy Bot 🔮" }).setTimestamp();
    return interaction.editReply({ content: "", embeds: [e] });
  }

  // ═══ /info ═══
  if (commandName === "info") {
    const e = new EmbedBuilder().setColor(0x9B59B6).setTitle("🔮 RuneClipy")
      .setDescription("Platform **brand × TikTok creator**.\n\n💰 Earn dari video\n🎵 Pilih campaign\n🏆 Leaderboard bonus\n📊 Dashboard real-time")
      .addFields(
        { name: "🌐 Website", value: "[runeclipy.vercel.app](https://runeclipy.vercel.app)", inline: true },
        { name: "📱 Daftar", value: "[Register](https://runeclipy.vercel.app/register)", inline: true },
      ).setFooter({ text: "Join sekarang! 🚀" }).setTimestamp();
    return interaction.reply({ embeds: [e] });
  }

  // ═══ /campaigns ═══
  if (commandName === "campaigns") {
    const camps = await Campaign.find({ status: "active" }).sort({ createdAt: -1 }).limit(10).lean();
    if (!camps.length) return interaction.reply({ content: "😔 Tidak ada campaign aktif.", ephemeral: true });
    const e = new EmbedBuilder().setColor(0x3498DB).setTitle("🎵 Campaign Aktif").setTimestamp();
    for (const c of camps) {
      const deadline = c.deadline ? `<t:${Math.floor(new Date(c.deadline).getTime()/1000)}:R>` : "No deadline";
      e.addFields({ name: c.title, value: `💰 ${fmtCurrency(c.ratePerView)}/view • ⏰ ${deadline}\n🔗 [Lihat](https://runeclipy.vercel.app/campaign/${c._id})` });
    }
    e.setFooter({ text: `${camps.length} campaign aktif` });
    return interaction.reply({ embeds: [e] });
  }

  // ═══ /campaign-detail ═══
  if (commandName === "campaign-detail") {
    const camps = await Campaign.find({ status: "active" }).sort({ createdAt: -1 }).limit(25).lean();
    if (!camps.length) return interaction.reply({ content: "😔 Tidak ada campaign aktif.", ephemeral: true });
    const options = camps.map(c => ({
      label: c.title.substring(0, 100),
      description: `${fmtCurrency(c.ratePerView)}/view • Budget: ${fmtCurrency(c.budget)}`,
      value: `detail_${c._id.toString()}`,
    }));
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId("campaign_detail").setPlaceholder("Pilih campaign...").addOptions(options)
    );
    return interaction.reply({ content: "📋 **Pilih campaign untuk lihat detail:**", components: [row], ephemeral: true });
  }

  // ═══ /submit ═══
  if (commandName === "submit") {
    const user = await User.findOne({ discordId: interaction.user.id }).lean();
    if (!user) return interaction.reply({ content: "❌ Belum terhubung! Gunakan `/link` atau login di web.", ephemeral: true });
    const accounts = await ConnectedAccount.find({ userId: user._id, isVerified: true }).lean();
    if (!accounts.length) return interaction.reply({ content: "❌ Belum punya TikTok terverifikasi. Tambahkan di web.", ephemeral: true });
    const camps = await Campaign.find({ status: "active" }).sort({ createdAt: -1 }).limit(25).lean();
    if (!camps.length) return interaction.reply({ content: "😔 Tidak ada campaign aktif.", ephemeral: true });
    const options = camps.map(c => ({ label: c.title.substring(0, 100), description: `${fmtCurrency(c.ratePerView)}/view`, value: c._id.toString() }));
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId("submit_campaign").setPlaceholder("Pilih campaign...").addOptions(options)
    );
    return interaction.reply({ content: "📤 **Pilih campaign untuk submit video:**", components: [row], ephemeral: true });
  }

  // ═══ /campaign-stats ═══
  if (commandName === "campaign-stats") {
    const user = await User.findOne({ discordId: interaction.user.id }).lean();
    if (!user) return interaction.reply({ content: "❌ Belum terhubung! Gunakan `/link`.", ephemeral: true });
    const subs = await Submission.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean();
    if (!subs.length) return interaction.reply({ content: "📋 Belum ada submission.", ephemeral: true });
    const campIds = [...new Set(subs.map(s => s.campaignId.toString()))];
    const camps = await Campaign.find({ _id: { $in: campIds } }).lean();
    const campMap = Object.fromEntries(camps.map(c => [c._id.toString(), c.title]));
    const statusEmoji = { pending: "⏳", approved: "✅", rejected: "❌", recheck: "🔄" };
    const e = new EmbedBuilder().setColor(0xF39C12).setTitle("📋 Submission Kamu").setTimestamp();
    for (const s of subs) {
      const camp = campMap[s.campaignId?.toString()] || "Unknown";
      e.addFields({ name: `${statusEmoji[s.status]||"❓"} ${camp}`, value: `Status: **${s.status}** • Views: \`${fmt(s.views||0)}\` • Earned: \`${fmtCurrency(s.earned)}\`\n🔗 ${s.videoUrl||"N/A"}` });
    }
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  // ═══ /profile ═══
  if (commandName === "profile") {
    const user = await User.findOne({ discordId: interaction.user.id }).lean();
    if (!user) return interaction.reply({ content: "❌ Belum terhubung! Gunakan `/link`.", ephemeral: true });
    const accounts = await ConnectedAccount.find({ userId: user._id }).lean();
    const tierEmoji = TIER_EMOJI[user.tier] || "🥉";
    const subs = await Submission.countDocuments({ userId: user._id });
    const e = new EmbedBuilder().setColor(0x9B59B6)
      .setTitle(`👤 ${user.nickname || user.username}`)
      .setDescription(`@${user.username}`)
      .addFields(
        { name: "🏅 Tier", value: `${tierEmoji} ${(user.tier||"bronze").charAt(0).toUpperCase()+(user.tier||"bronze").slice(1)}`, inline: true },
        { name: "👑 Role", value: user.role || "user", inline: true },
        { name: "🎬 Videos", value: `\`${user.stats?.totalVideos||0}\``, inline: true },
        { name: "👁️ Views", value: `\`${fmt(user.stats?.totalViews||0)}\``, inline: true },
        { name: "💰 Earned", value: `\`${fmtCurrency(user.stats?.totalEarned)}\``, inline: true },
        { name: "📤 Submissions", value: `\`${subs}\``, inline: true },
        { name: "📱 TikTok", value: accounts.map(a => `@${a.tiktokUsername} ${a.isVerified?"✅":"❌"}`).join("\n") || "None", inline: true },
      ).setFooter({ text: "RuneClipy 🔮" }).setTimestamp();
    if (user.badges?.length) e.addFields({ name: "🏆 Badges", value: user.badges.join(", ") });
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  // ═══ /leaderboard ═══
  if (commandName === "leaderboard") {
    const top = await User.find({ isBanned: { $ne: true }, isDeleted: { $ne: true } })
      .sort({ "stats.totalViews": -1 }).limit(10).lean();
    if (!top.length) return interaction.reply({ content: "📊 Belum ada data.", ephemeral: true });
    const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
    let desc = "";
    top.forEach((u, i) => {
      const tierE = TIER_EMOJI[u.tier] || "";
      desc += `${medals[i]} **${u.nickname||u.username}** ${tierE}\n`;
      desc += `   👁️ ${fmt(u.stats?.totalViews||0)} views • 💰 ${fmtCurrency(u.stats?.totalEarned)} • 🎬 ${u.stats?.totalVideos||0}\n\n`;
    });
    const e = new EmbedBuilder().setColor(0xFFD700).setTitle("🏆 Leaderboard — Top Creators")
      .setDescription(desc).setFooter({ text: "Sorted by total views" }).setTimestamp();
    return interaction.reply({ embeds: [e] });
  }

  // ═══ /balance ═══
  if (commandName === "balance") {
    const user = await User.findOne({ discordId: interaction.user.id }).lean();
    if (!user) return interaction.reply({ content: "❌ Belum terhubung! Gunakan `/link`.", ephemeral: true });
    const txs = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).lean();
    const total = (user.campaignBalance||0) + (user.referralBalance||0);
    const e = new EmbedBuilder().setColor(0x2ECC71).setTitle("💰 Balance")
      .addFields(
        { name: "💵 Campaign Balance", value: `\`${fmtCurrency(user.campaignBalance)}\``, inline: true },
        { name: "🔗 Referral Balance", value: `\`${fmtCurrency(user.referralBalance)}\``, inline: true },
        { name: "📊 Total", value: `\`${fmtCurrency(total)}\``, inline: true },
      ).setTimestamp();
    if (txs.length) {
      const txEmoji = { campaign_earning: "💵", referral_earning: "🔗", payout: "💸", refund: "↩️" };
      let txText = "";
      txs.forEach(t => {
        txText += `${txEmoji[t.type]||"📝"} ${t.type} • \`${fmtCurrency(t.amount)}\` • ${t.status}\n`;
      });
      e.addFields({ name: "📜 Recent Transactions", value: txText });
    }
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  // ═══ /referral ═══
  if (commandName === "referral") {
    const user = await User.findOne({ discordId: interaction.user.id }).lean();
    if (!user) return interaction.reply({ content: "❌ Belum terhubung! Gunakan `/link`.", ephemeral: true });
    const refs = await Referral.find({ referrerId: user._id }).lean();
    const totalEarned = refs.reduce((s,r) => s + (r.totalEarned||0), 0);
    const e = new EmbedBuilder().setColor(0xE67E22).setTitle("🔗 Referral Program")
      .addFields(
        { name: "🔑 Kode Referral", value: `\`${user.referralCode || "N/A"}\`` },
        { name: "📎 Link", value: `https://runeclipy.vercel.app/register?ref=${user.referralCode||""}` },
        { name: "👥 Total Referrals", value: `\`${refs.length}\``, inline: true },
        { name: "💰 Total Earned", value: `\`${fmtCurrency(totalEarned)}\``, inline: true },
        { name: "💵 Referral Balance", value: `\`${fmtCurrency(user.referralBalance)}\``, inline: true },
      ).setTimestamp();
    if (refs.length) {
      const list = refs.slice(0,5).map(r => `• @${r.referredUsername} — ${fmtCurrency(r.totalEarned)}`).join("\n");
      e.addFields({ name: "📋 Recent Referrals", value: list });
    }
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  // ═══ /link ═══
  if (commandName === "link") {
    const existing = await User.findOne({ discordId: interaction.user.id }).lean();
    if (existing) return interaction.reply({ content: `✅ Akun Discord kamu sudah terhubung ke **@${existing.username}**!`, ephemeral: true });

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await LinkToken.create({
      token, discordId: interaction.user.id,
      discordUsername: interaction.user.tag,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });
    const e = new EmbedBuilder().setColor(0x5865F2).setTitle("🔗 Link Discord Account")
      .setDescription("Ikuti langkah berikut untuk menghubungkan akun:")
      .addFields(
        { name: "1️⃣ Buka web", value: "[runeclipy.vercel.app/profile](https://runeclipy.vercel.app/profile)" },
        { name: "2️⃣ Klik 'Link Discord'", value: "Di bagian Connected Accounts" },
        { name: "3️⃣ Masukkan kode ini:", value: `\`\`\`${token}\`\`\`` },
      )
      .setFooter({ text: "⏰ Kode expired dalam 10 menit" }).setTimestamp();
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  // ═══ /daily-stats (admin only) ═══
  if (commandName === "daily-stats") {
    if (!(await isAdmin(interaction.user.id))) return interaction.reply({ content: "❌ Admin only.", ephemeral: true });
    const today = new Date(); today.setHours(0,0,0,0);
    const [newUsers, newSubs, approvedToday, rejectedToday, newCampaigns] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: today } }),
      Submission.countDocuments({ createdAt: { $gte: today } }),
      Submission.countDocuments({ status: "approved", updatedAt: { $gte: today } }),
      Submission.countDocuments({ status: "rejected", updatedAt: { $gte: today } }),
      Campaign.countDocuments({ createdAt: { $gte: today } }),
    ]);
    const pendingTotal = await Submission.countDocuments({ status: "pending" });
    const e = new EmbedBuilder().setColor(0x3498DB).setTitle("📈 Daily Stats — Today")
      .addFields(
        { name: "👤 New Users", value: `\`${newUsers}\``, inline: true },
        { name: "📤 New Submissions", value: `\`${newSubs}\``, inline: true },
        { name: "🎵 New Campaigns", value: `\`${newCampaigns}\``, inline: true },
        { name: "✅ Approved Today", value: `\`${approvedToday}\``, inline: true },
        { name: "❌ Rejected Today", value: `\`${rejectedToday}\``, inline: true },
        { name: "⏳ Total Pending", value: `\`${pendingTotal}\``, inline: true },
      ).setFooter({ text: "RuneClipy Admin" }).setTimestamp();
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  // ═══ /mod-review ═══
  if (commandName === "mod-review") {
    if (!(await isMod(interaction.user.id))) return interaction.reply({ content: "❌ Moderator/Admin only.", ephemeral: true });
    await sendReviewEmbed(interaction, 0);
  }

  // ═══ /mod-approve ═══
  if (commandName === "mod-approve") {
    if (!(await isMod(interaction.user.id))) return interaction.reply({ content: "❌ Moderator/Admin only.", ephemeral: true });
    const id = interaction.options.getString("id");
    const sub = await Submission.findById(id);
    if (!sub) return interaction.reply({ content: "❌ Submission tidak ditemukan.", ephemeral: true });
    if (sub.status !== "pending") return interaction.reply({ content: `⚠️ Submission sudah **${sub.status}**.`, ephemeral: true });
    sub.status = "approved"; sub.dmNotified = false; await sub.save();
    return interaction.reply({ content: `✅ Submission \`${id}\` approved!`, ephemeral: true });
  }

  // ═══ /mod-reject ═══
  if (commandName === "mod-reject") {
    if (!(await isMod(interaction.user.id))) return interaction.reply({ content: "❌ Moderator/Admin only.", ephemeral: true });
    const id = interaction.options.getString("id");
    const reason = interaction.options.getString("reason");
    const sub = await Submission.findById(id);
    if (!sub) return interaction.reply({ content: "❌ Submission tidak ditemukan.", ephemeral: true });
    if (sub.status !== "pending") return interaction.reply({ content: `⚠️ Submission sudah **${sub.status}**.`, ephemeral: true });
    sub.status = "rejected"; sub.dmNotified = false; await sub.save();
    // DM user about rejection
    const user = await User.findById(sub.userId).lean();
    if (user?.discordId) {
      try {
        const dcUser = await client.users.fetch(user.discordId);
        const camp = await Campaign.findById(sub.campaignId).lean();
        await dcUser.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle("❌ Submission Rejected")
          .addFields(
            { name: "🎵 Campaign", value: camp?.title || "Unknown" },
            { name: "🔗 Video", value: sub.videoUrl || "N/A" },
            { name: "📝 Reason", value: reason },
          ).setTimestamp()] });
      } catch {}
    }
    return interaction.reply({ content: `❌ Submission \`${id}\` rejected. Reason: ${reason}`, ephemeral: true });
  }

  // ═══ /mod-stats ═══
  if (commandName === "mod-stats") {
    if (!(await isMod(interaction.user.id))) return interaction.reply({ content: "❌ Moderator/Admin only.", ephemeral: true });
    const today = new Date(); today.setHours(0,0,0,0);
    const [pending, approvedToday, rejectedToday, totalAll] = await Promise.all([
      Submission.countDocuments({ status: "pending" }),
      Submission.countDocuments({ status: "approved", updatedAt: { $gte: today } }),
      Submission.countDocuments({ status: "rejected", updatedAt: { $gte: today } }),
      Submission.countDocuments(),
    ]);
    const e = new EmbedBuilder().setColor(0x9B59B6).setTitle("🛡️ Moderation Stats")
      .addFields(
        { name: "⏳ Pending", value: `\`${pending}\``, inline: true },
        { name: "✅ Approved Today", value: `\`${approvedToday}\``, inline: true },
        { name: "❌ Rejected Today", value: `\`${rejectedToday}\``, inline: true },
        { name: "📊 Total Submissions", value: `\`${totalAll}\``, inline: true },
      ).setFooter({ text: "Use /mod-review to review pending" }).setTimestamp();
    return interaction.reply({ embeds: [e], ephemeral: true });
  }
}

// ─── /mod-review Helper ──────────────────────────────────
async function sendReviewEmbed(interaction, skip) {
  const subs = await Submission.find({ status: "pending" }).sort({ createdAt: 1 }).skip(skip).limit(1).lean();
  const total = await Submission.countDocuments({ status: "pending" });
  if (!subs.length) {
    const msg = { content: "✅ Tidak ada submission pending!", ephemeral: true };
    return interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
  }
  const s = subs[0];
  const user = await User.findById(s.userId).lean();
  const camp = await Campaign.findById(s.campaignId).lean();
  const e = new EmbedBuilder().setColor(0xF39C12).setTitle("🛡️ Review Submission")
    .addFields(
      { name: "📋 ID", value: `\`${s._id}\`` },
      { name: "👤 User", value: user ? `@${user.username}` : "Unknown", inline: true },
      { name: "🎵 Campaign", value: camp?.title || "Unknown", inline: true },
      { name: "🔗 Video", value: s.videoUrl || "N/A" },
      { name: "👁️ Views", value: `\`${fmt(s.views||0)}\``, inline: true },
      { name: "📊 Queue", value: `${skip+1}/${total}`, inline: true },
    ).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`review_approve_${s._id}`).setLabel("✅ Approve").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`review_reject_${s._id}`).setLabel("❌ Reject").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`review_skip_${skip+1}`).setLabel("⏭️ Skip").setStyle(ButtonStyle.Secondary),
  );
  const payload = { embeds: [e], components: [row], ephemeral: true };
  return interaction.replied || interaction.deferred ? interaction.editReply(payload) : interaction.reply(payload);
}

// ─── Button Handler ──────────────────────────────────────
async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith("review_approve_")) {
    const subId = id.replace("review_approve_", "");
    const sub = await Submission.findById(subId);
    if (!sub || sub.status !== "pending") {
      return interaction.update({ content: "⚠️ Already processed.", embeds: [], components: [] });
    }
    sub.status = "approved"; sub.dmNotified = false; await sub.save();
    await interaction.update({ content: `✅ Submission \`${subId}\` approved!`, embeds: [], components: [] });
  }

  else if (id.startsWith("review_reject_")) {
    const subId = id.replace("review_reject_", "");
    const modal = new ModalBuilder().setCustomId(`reject_reason_${subId}`).setTitle("Reject Reason");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("reason").setLabel("Alasan reject").setStyle(TextInputStyle.Short).setRequired(true)
    ));
    return interaction.showModal(modal);
  }

  else if (id.startsWith("review_skip_")) {
    const skip = parseInt(id.replace("review_skip_", "")) || 0;
    await interaction.deferUpdate();
    await sendReviewEmbed(interaction, skip);
  }
}

// ─── Select Menu Handler ─────────────────────────────────
async function handleSelect(interaction) {
  if (interaction.customId === "submit_campaign") {
    const campaignId = interaction.values[0];
    const camp = await Campaign.findById(campaignId).lean();
    if (!camp) return interaction.reply({ content: "❌ Campaign tidak ditemukan.", ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`submit_video_${campaignId}`).setTitle(`Submit: ${camp.title.substring(0,40)}`);
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("video_url").setLabel("URL Video TikTok").setStyle(TextInputStyle.Short)
        .setPlaceholder("https://www.tiktok.com/@user/video/123...").setRequired(true)
    ));
    return interaction.showModal(modal);
  }

  if (interaction.customId === "campaign_detail") {
    const campaignId = interaction.values[0].replace("detail_", "");
    const c = await Campaign.findById(campaignId).lean();
    if (!c) return interaction.reply({ content: "❌ Campaign tidak ditemukan.", ephemeral: true });
    const subCount = await Submission.countDocuments({ campaignId: c._id });
    const approvedCount = await Submission.countDocuments({ campaignId: c._id, status: "approved" });
    const remaining = (c.budget||0) - (c.spent||0);
    const deadline = c.deadline ? `<t:${Math.floor(new Date(c.deadline).getTime()/1000)}:R>` : "No deadline";
    const e = new EmbedBuilder().setColor(0x3498DB).setTitle(`📋 ${c.title}`)
      .setDescription(c.description || "No description")
      .addFields(
        { name: "💰 Rate", value: `${fmtCurrency(c.ratePerView)}/view`, inline: true },
        { name: "💵 Budget", value: fmtCurrency(c.budget), inline: true },
        { name: "💸 Remaining", value: fmtCurrency(remaining), inline: true },
        { name: "📤 Submissions", value: `\`${subCount}\``, inline: true },
        { name: "✅ Approved", value: `\`${approvedCount}\``, inline: true },
        { name: "⏰ Deadline", value: deadline, inline: true },
      ).setFooter({ text: `Status: ${c.status}` }).setTimestamp();
    if (c.imageUrl) e.setThumbnail(c.imageUrl);
    return interaction.reply({ embeds: [e], ephemeral: true });
  }
}

// ─── Modal Handler ───────────────────────────────────────
async function handleModal(interaction) {
  if (interaction.customId.startsWith("submit_video_")) {
    const campaignId = interaction.customId.replace("submit_video_", "");
    const videoUrl = interaction.fields.getTextInputValue("video_url");
    if (!videoUrl.includes("tiktok.com")) return interaction.reply({ content: "❌ URL harus dari TikTok!", ephemeral: true });
    const user = await User.findOne({ discordId: interaction.user.id }).lean();
    if (!user) return interaction.reply({ content: "❌ User tidak ditemukan.", ephemeral: true });
    const existing = await Submission.findOne({ userId: user._id, campaignId, videoUrl });
    if (existing) return interaction.reply({ content: "❌ Video sudah disubmit.", ephemeral: true });
    const camp = await Campaign.findById(campaignId).lean();
    if (!camp || camp.status !== "active") return interaction.reply({ content: "❌ Campaign tidak aktif.", ephemeral: true });
    await Submission.create({ userId: user._id, campaignId, videoUrl, status: "pending", views: 0, earned: 0 });
    const e = new EmbedBuilder().setColor(0x2ECC71).setTitle("✅ Video Submitted!")
      .addFields(
        { name: "🎵 Campaign", value: camp.title },
        { name: "🔗 Video", value: videoUrl },
        { name: "📋 Status", value: "⏳ Pending Review" },
      ).setFooter({ text: "/campaign-stats untuk cek progress" }).setTimestamp();
    return interaction.reply({ embeds: [e], ephemeral: true });
  }

  if (interaction.customId.startsWith("reject_reason_")) {
    const subId = interaction.customId.replace("reject_reason_", "");
    const reason = interaction.fields.getTextInputValue("reason");
    const sub = await Submission.findById(subId);
    if (!sub || sub.status !== "pending") return interaction.reply({ content: "⚠️ Already processed.", ephemeral: true });
    sub.status = "rejected"; sub.dmNotified = false; await sub.save();
    // DM
    const user = await User.findById(sub.userId).lean();
    if (user?.discordId) {
      try {
        const dcUser = await client.users.fetch(user.discordId);
        const camp = await Campaign.findById(sub.campaignId).lean();
        await dcUser.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle("❌ Submission Rejected")
          .addFields({ name: "🎵 Campaign", value: camp?.title||"Unknown" }, { name: "📝 Reason", value: reason }).setTimestamp()] });
      } catch {}
    }
    return interaction.reply({ content: `❌ Rejected \`${subId}\`. Reason: ${reason}`, ephemeral: true });
  }
}

// ─── Auto Systems ────────────────────────────────────────
async function autoNotifyCampaigns() {
  try {
    const settings = await SiteSetting.findOne().lean();
    const channelId = settings?.discordNotifChannelId;
    if (!channelId || !client) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const newCampaigns = await Campaign.find({ status: "active", notifiedDiscord: { $ne: true } }).lean();
    for (const c of newCampaigns) {
      const deadline = c.deadline ? `<t:${Math.floor(new Date(c.deadline).getTime()/1000)}:R>` : "No deadline";
      const e = new EmbedBuilder().setColor(0x00D4AA).setTitle("🎵 New Campaign!")
        .setDescription(`**${c.title}**\n${c.description || ""}`)
        .addFields(
          { name: "💰 Rate", value: `${fmtCurrency(c.ratePerView)}/view`, inline: true },
          { name: "💵 Budget", value: fmtCurrency(c.budget), inline: true },
          { name: "⏰ Deadline", value: deadline, inline: true },
        )
        .setFooter({ text: "Submit sekarang di web! 🚀" }).setTimestamp();
      if (c.imageUrl) e.setThumbnail(c.imageUrl);
      await channel.send({ embeds: [e] });
      await Campaign.updateOne({ _id: c._id }, { $set: { notifiedDiscord: true } });
    }
  } catch (err) { console.error("[Auto] Campaign notif:", err.message); }
}

async function autoNotifySubmissions() {
  try {
    if (!client) return;
    const subs = await Submission.find({ status: { $in: ["approved","rejected"] }, dmNotified: { $ne: true } }).limit(10).lean();
    for (const s of subs) {
      const user = await User.findById(s.userId).lean();
      if (!user?.discordId) { await Submission.updateOne({ _id: s._id }, { $set: { dmNotified: true } }); continue; }
      try {
        const dcUser = await client.users.fetch(user.discordId);
        const camp = await Campaign.findById(s.campaignId).lean();
        const isApproved = s.status === "approved";
        const e = new EmbedBuilder()
          .setColor(isApproved ? 0x2ECC71 : 0xED4245)
          .setTitle(isApproved ? "✅ Submission Approved!" : "❌ Submission Rejected")
          .addFields(
            { name: "🎵 Campaign", value: camp?.title || "Unknown" },
            { name: "🔗 Video", value: s.videoUrl || "N/A" },
          );
        if (isApproved) e.addFields({ name: "💰 Earned", value: `\`${fmtCurrency(s.earned)}\`` });
        e.setTimestamp();
        await dcUser.send({ embeds: [e] });
      } catch {}
      await Submission.updateOne({ _id: s._id }, { $set: { dmNotified: true } });
    }
  } catch (err) {
    console.error("[Auto] Submission notif error:", err.message);
  }
}

async function autoSyncRoles() {
  try {
    if (!client) return;
    const guildId = await getGuildId();
    if (!guildId) return;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    // Ensure roles exist
    for (const [tier, cfg] of Object.entries(TIER_ROLES)) {
      let role = guild.roles.cache.find(r => r.name === cfg.name);
      if (!role) {
        try {
          role = await guild.roles.create({ name: cfg.name, color: cfg.color, reason: "RuneClipy tier sync" });
          console.log(`[Bot] ✅ Created role: ${cfg.name}`);
        } catch (e) { console.error(`[Bot] ⚠️ Can't create role ${cfg.name}:`, e.message); }
      }
    }

    // Sync users
    const users = await User.find({ discordId: { $exists: true, $ne: "" } }).lean();
    for (const u of users) {
      if (u.lastTierSynced === u.tier) continue;
      try {
        const member = await guild.members.fetch(u.discordId).catch(() => null);
        if (!member) continue;

        // Remove old tier roles
        for (const cfg of Object.values(TIER_ROLES)) {
          const role = guild.roles.cache.find(r => r.name === cfg.name);
          if (role && member.roles.cache.has(role.id)) await member.roles.remove(role);
        }

        // Add new tier role
        const newCfg = TIER_ROLES[u.tier];
        if (newCfg) {
          const role = guild.roles.cache.find(r => r.name === newCfg.name);
          if (role) await member.roles.add(role);
        }

        await User.updateOne({ _id: u._id }, { $set: { lastTierSynced: u.tier } });
      } catch {}
    }
  } catch (err) { console.error("[Auto] Role sync:", err.message); }
}

// ─── AI Responder System ─────────────────────────────────
const { GoogleGenerativeAI } = require("@google/generative-ai");
const os = require("os");
const { execSync } = require("child_process");

const botTools = [
  {
    name: "check_server_stats",
    description: "Periksa statistik performa server VPS (CPU, RAM, Uptime, disk space, dan proses PM2).",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    }
  },
  {
    name: "get_current_time",
    description: "Dapatkan waktu, tanggal, dan zona waktu server saat ini.",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    }
  },
  {
    name: "get_platform_stats",
    description: "Ambil statistik ringkasan platform (total user, campaign aktif, submission pending, dll).",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: [],
    }
  },
  {
    name: "search_users",
    description: "Cari data user berdasarkan role, tier, status ban, atau kata kunci pencarian.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Kata kunci pencarian (username/email/nickname)" },
        role: { type: "STRING", description: "Filter berdasarkan role (user, moderator, admin)" },
        tier: { type: "STRING", description: "Filter berdasarkan tier (bronze, silver, gold, diamond)" },
        isBanned: { type: "BOOLEAN", description: "Filter status ban" },
        limit: { type: "NUMBER", description: "Maksimal data yang dikembalikan (default: 10)" },
      },
      required: [],
    }
  },
  {
    name: "get_user_detail",
    description: "Ambil detail lengkap data seorang user berdasarkan userId atau username.",
    parameters: {
      type: "OBJECT",
      properties: {
        userId: { type: "STRING", description: "MongoDB ObjectId user" },
        username: { type: "STRING", description: "Username user" },
      },
      required: [],
    }
  },
  {
    name: "edit_user",
    description: "Ubah data akun user (seperti role, tier, saldo campaign, saldo referral, status ban).",
    parameters: {
      type: "OBJECT",
      properties: {
        userId: { type: "STRING", description: "MongoDB ObjectId user (opsional)" },
        username: { type: "STRING", description: "Username user (opsional)" },
        updates: {
          type: "OBJECT",
          description: "Data baru yang ingin diterapkan",
          properties: {
            role: { type: "STRING", description: "Role baru: user, moderator, admin" },
            tier: { type: "STRING", description: "Tier baru: bronze, silver, gold, diamond" },
            campaignBalance: { type: "NUMBER", description: "Saldo campaign baru (USD)" },
            referralBalance: { type: "NUMBER", description: "Saldo referral baru (USD)" },
            isBanned: { type: "BOOLEAN", description: "Status ban baru" },
          }
        },
        reason: { type: "STRING", description: "Alasan pengubahan (wajib)" },
      },
      required: ["updates", "reason"],
    }
  },
  {
    name: "search_campaigns",
    description: "Cari campaign yang terdaftar di platform berdasarkan status atau kata kunci.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Kata kunci pencarian judul campaign" },
        status: { type: "STRING", description: "Filter status: active, paused, ended" },
        limit: { type: "NUMBER", description: "Maksimal data (default: 10)" },
      },
      required: [],
    }
  },
  {
    name: "edit_campaign",
    description: "Ubah data campaign (seperti status, budget, ratePerView).",
    parameters: {
      type: "OBJECT",
      properties: {
        campaignId: { type: "STRING", description: "MongoDB ObjectId campaign" },
        updates: {
          type: "OBJECT",
          description: "Data baru yang ingin diterapkan",
          properties: {
            status: { type: "STRING", description: "Status baru: active, paused, ended" },
            budget: { type: "NUMBER", description: "Budget baru (USD)" },
            ratePerView: { type: "NUMBER", description: "Rate per view baru (USD)" },
          }
        },
        reason: { type: "STRING", description: "Alasan pengubahan (wajib)" },
      },
      required: ["updates", "reason"],
    }
  },
  {
    name: "search_submissions",
    description: "Cari submission video dari creator berdasarkan status, campaignId, atau userId.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filter status: pending, approved, rejected, paid_out" },
        campaignId: { type: "STRING", description: "Filter campaign ID" },
        userId: { type: "STRING", description: "Filter user ID" },
        limit: { type: "NUMBER", description: "Maksimal data (default: 10)" },
      },
      required: [],
    }
  },
  {
    name: "update_submission",
    description: "Ubah status submission (Approve / Reject).",
    parameters: {
      type: "OBJECT",
      properties: {
        submissionId: { type: "STRING", description: "MongoDB ObjectId submission" },
        action: { type: "STRING", description: "Aksi: approved atau rejected" },
        rejectReason: { type: "STRING", description: "Alasan reject (wajib jika action=rejected)" },
      },
      required: ["submissionId", "action"],
    }
  }
];

async function executeBotTool(name, args, authorId, authorUsername) {
  try {
    switch (name) {
      case "check_server_stats": {
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;
        const cpuLoad = os.loadavg();
        let diskUsage = "";
        try {
          diskUsage = execSync("df -h / 2>/dev/null || wmic logicaldisk get size,freespace,caption").toString();
        } catch {}
        let pm2List = "";
        try {
          pm2List = execSync("pm2 list --no-color").toString();
        } catch {}
        
        return {
          os: {
            platform: os.platform(),
            arch: os.arch(),
            uptime: os.uptime(),
            cpuCount: os.cpus().length,
            loadAvg: cpuLoad,
          },
          memory: {
            totalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
            usedGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
            freeGB: (freeMem / 1024 / 1024 / 1024).toFixed(2),
            percentUsed: ((usedMem / totalMem) * 100).toFixed(1) + "%",
          },
          disk: diskUsage.trim() || "N/A",
          pm2: pm2List.trim() || "N/A"
        };
      }

      case "get_current_time": {
        return {
          iso: new Date().toISOString(),
          local: new Date().toLocaleString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }

      case "get_platform_stats": {
        const [totalUsers, activeCampaigns, totalCampaigns, pendingSubmissions, totalSubmissions] = await Promise.all([
          User.countDocuments({ isDeleted: { $ne: true }, role: { $ne: "admin" } }),
          Campaign.countDocuments({ status: "active" }),
          Campaign.countDocuments({}),
          Submission.countDocuments({ status: "pending" }),
          Submission.countDocuments({}),
        ]);
        return { totalUsers, activeCampaigns, totalCampaigns, pendingSubmissions, totalSubmissions };
      }

      case "search_users": {
        const filter = { isDeleted: { $ne: true } };
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
          .select("username nickname email role tier campaignBalance referralBalance isBanned stats")
          .sort({ memberSince: -1 })
          .limit(args.limit || 10)
          .lean();
        return { count: users.length, users };
      }

      case "get_user_detail": {
        const filter = { isDeleted: { $ne: true } };
        if (args.userId) filter._id = args.userId;
        else if (args.username) filter.username = args.username.toLowerCase();
        const user = await User.findOne(filter).lean();
        if (!user) return { error: "User tidak ditemukan" };
        return { user };
      }

      case "edit_user": {
        const filter = { isDeleted: { $ne: true } };
        if (args.userId) filter._id = args.userId;
        else if (args.username) filter.username = args.username.toLowerCase();

        const user = await User.findOne(filter);
        if (!user) return { error: "User tidak ditemukan" };

        const { updates, reason } = args;
        const allowedFields = ["role", "tier", "campaignBalance", "referralBalance", "isBanned"];
        const appliedChanges = {};

        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            user[field] = updates[field];
            appliedChanges[field] = updates[field];
          }
        }

        await user.save();

        // Log to activity log
        await ActivityLog.create({
          actor: `discord_bot_${authorUsername}`,
          actorId: authorId,
          action: "bot_edit_user",
          target: user._id.toString(),
          targetType: "user",
          details: `Bot AI Assistant mengedit user @${user.username}: ${JSON.stringify(appliedChanges)}. Alasan: ${reason}`,
        });

        return { success: true, message: `User @${user.username} berhasil diupdate`, changes: appliedChanges };
      }

      case "search_campaigns": {
        const filter = {};
        if (args.status) filter.status = args.status;
        if (args.query) filter.title = { $regex: args.query, $options: "i" };

        const campaigns = await Campaign.find(filter)
          .select("title status budget spent ratePerView")
          .sort({ createdAt: -1 })
          .limit(args.limit || 10)
          .lean();
        return { count: campaigns.length, campaigns };
      }

      case "edit_campaign": {
        const campaign = await Campaign.findById(args.campaignId);
        if (!campaign) return { error: "Campaign tidak ditemukan" };

        const { updates, reason } = args;
        const allowedFields = ["status", "budget", "ratePerView"];
        const appliedChanges = {};

        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            campaign[field] = updates[field];
            appliedChanges[field] = updates[field];
          }
        }

        await campaign.save();

        await ActivityLog.create({
          actor: `discord_bot_${authorUsername}`,
          actorId: authorId,
          action: "bot_edit_campaign",
          target: campaign._id.toString(),
          targetType: "campaign",
          details: `Bot AI Assistant mengedit campaign "${campaign.title}": ${JSON.stringify(appliedChanges)}. Alasan: ${reason}`,
        });

        return { success: true, message: `Campaign "${campaign.title}" berhasil diupdate`, changes: appliedChanges };
      }

      case "search_submissions": {
        const filter = {};
        if (args.status) filter.status = args.status;
        if (args.campaignId) filter.campaignId = args.campaignId;
        if (args.userId) filter.userId = args.userId;

        const submissions = await Submission.find(filter)
          .populate("userId", "username")
          .populate("campaignId", "title")
          .select("videoUrl views status earned")
          .sort({ createdAt: -1 })
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
          actor: `discord_bot_${authorUsername}`,
          actorId: authorId,
          action: `bot_${args.action}_submission`,
          target: submission._id.toString(),
          targetType: "submission",
          details: `Bot AI Assistant mengubah status submission ${args.submissionId} menjadi ${args.action}`,
        });

        return { success: true, message: `Submission berhasil diubah menjadi ${args.action}` };
      }

      default:
        return { error: `Tool ${name} tidak dikenali` };
    }
  } catch (err) {
    return { error: err.message };
  }
}

async function runBotAIChat(settings, history, newMessage, systemInstruction, enableTools, authorId, authorUsername) {
  const keys = settings.geminiApiKeys && settings.geminiApiKeys.length > 0 
    ? settings.geminiApiKeys 
    : (settings.geminiApiKey ? [settings.geminiApiKey] : []);
  const activeKeys = keys.filter(k => k && k.trim().length > 0);
  
  if (activeKeys.length === 0) {
    throw new Error("API key Gemini tidak dikonfigurasi.");
  }
  
  let lastError = null;
  for (let i = 0; i < activeKeys.length; i++) {
    const currentKey = activeKeys[i];
    const modelsToTry = [settings.geminiModel || "gemini-2.0-flash"];
    if (settings.geminiModel && settings.geminiModel !== "gemini-2.0-flash") {
      modelsToTry.push("gemini-2.0-flash");
    }
    if (settings.geminiModel && settings.geminiModel !== "gemini-1.5-pro") {
      modelsToTry.push("gemini-1.5-pro");
    }
    if (settings.geminiModel && settings.geminiModel !== "gemini-1.5-flash") {
      modelsToTry.push("gemini-1.5-flash");
    }
    
    for (const currentModel of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(currentKey);
        const modelOptions = {
          model: currentModel,
          systemInstruction: systemInstruction,
        };
        if (enableTools) {
          modelOptions.tools = [{ functionDeclarations: botTools }];
        }
        const model = genAI.getGenerativeModel(modelOptions);
        const chat = model.startChat({ history });
        
        let result = await chat.sendMessage(newMessage);
        let response = result.response;

        // Tool calling loop
        while (enableTools && response.functionCalls() && response.functionCalls().length > 0) {
          const functionCalls = response.functionCalls();
          const toolResults = [];
          
          for (const call of functionCalls) {
            console.log(`[Bot AI Tool] Executing: ${call.name} with args:`, call.args);
            const toolResult = await executeBotTool(call.name, call.args, authorId, authorUsername);
            toolResults.push({
              functionResponse: {
                name: call.name,
                response: toolResult,
              }
            });
          }
          
          result = await chat.sendMessage(toolResults);
          response = result.response;
        }

        return response.text();
      } catch (error) {
        console.error(`[Bot AI] Gagal dengan model ${currentModel} menggunakan key index ke-${i}:`, error.message);
        lastError = error;
        
        const errorMsg = error.message || "";
        const errorMsgLower = errorMsg.toLowerCase();
        
        const isModelIssue = 
          errorMsg.includes("503") || 
          errorMsg.includes("500") || 
          errorMsg.includes("404") ||
          errorMsgLower.includes("service unavailable") ||
          errorMsgLower.includes("model not found") ||
          errorMsgLower.includes("not found");
        if (isModelIssue) continue;
        
        const isQuotaOrKeyError =
          errorMsg.includes("429") ||
          errorMsgLower.includes("quota") ||
          errorMsgLower.includes("resourceexhausted") ||
          errorMsgLower.includes("limit") ||
          errorMsgLower.includes("api key") ||
          errorMsgLower.includes("key not valid") ||
          errorMsgLower.includes("unauthorized") ||
          errorMsg.includes("403");
        if (isQuotaOrKeyError) break;
        continue;
      }
    }
  }
  throw lastError || new Error("Semua model/kunci API gagal.");
}

async function handleMessageCreate(message) {
  if (message.author.bot) return;

  try {
    const settings = await SiteSetting.findOne().lean();
    if (!settings || !settings.enableDiscordAIChat || !settings.discordChatChannelId) return;
    if (message.channel.id !== settings.discordChatChannelId) return;

    // Show typing
    console.log(`[Bot AI Chat] Received message from @${message.author.tag} in channel ${message.channel.id}: "${message.content}"`);
    await message.channel.sendTyping();

    // Check if user is admin
    const userProfile = await User.findOne({ discordId: message.author.id }).lean();
    const isAdmin = (userProfile && userProfile.role === "admin") || 
                    message.member?.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild?.ownerId === message.author.id;

    // Get message history (max 15 messages)
    const rawMsgs = await message.channel.messages.fetch({ limit: 15 });
    const sortedMsgs = Array.from(rawMsgs.values()).reverse();
    
    const history = [];
    for (const m of sortedMsgs) {
      if (m.id === message.id) continue;
      if (m.author.bot && m.author.id !== client.user.id) continue;
      
      const role = m.author.id === client.user.id ? "model" : "user";
      const text = m.content || "";
      if (!text.trim()) continue;
      
      history.push({ role, parts: [{ text }] });
    }
    
    // Clean history for Gemini
    const cleanHistory = [];
    let lastRole = null;
    for (const h of history) {
      if (h.role === lastRole) {
        cleanHistory[cleanHistory.length - 1].parts[0].text += "\n" + h.parts[0].text;
      } else {
        cleanHistory.push(h);
        lastRole = h.role;
      }
    }
    if (cleanHistory.length > 0 && cleanHistory[0].role === "model") {
      cleanHistory.shift();
    }

    let systemInstruction = "";
    if (isAdmin) {
      systemInstruction = `Kamu adalah RuneClipy Admin Copilot — asisten AI eksekutif, cerdas, loyal, dan serba bisa untuk Owner/Admin platform RuneClipy. Panggil bosmu dengan sebutan "Bos" secara akrab dan setia.

GAYA KOMUNIKASI:
1. Kasual, akrab, loyal, dan hormat seperti asisten setia.
2. Jawab secara cepat, akurat, to-the-point, dan hilangkan basa-basi tidak penting. Gunakan tabel/list Markdown yang rapi untuk menyajikan data statistik.

PRINSIP UTAMA:
- Kamu adalah eksekutor handal. Jika Bos memberikan perintah yang bisa dikerjakan dengan tool, LANGSUNG panggil tool tersebut secara otomatis tanpa meminta izin atau konfirmasi berulang kali.
- Jika Bos bertanya tentang spesifikasi/performa server, disk, memory, atau pm2 → LANGSUNG panggil 'check_server_stats'.
- Jika Bos menanyakan jam/waktu sekarang → LANGSUNG panggil 'get_current_time'.
- Jika Bos menanyakan tentang statistik platform, total user, submission pending → LANGSUNG panggil 'get_platform_stats'.
- Jika Bos meminta pencarian user, detail user, atau mengubah data user (tier, role, balance, status ban) → gunakan tool 'search_users', 'get_user_detail', atau 'edit_user' yang relevan secara proaktif.
- Jika Bos meminta peninjauan submission video, menyetujui (approve), atau menolak (reject) submission → gunakan tool 'search_submissions' atau 'update_submission' secara proaktif.

[INFO WAKTU SEKARANG]:
Waktu server saat ini adalah: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB / ${new Date().toISOString()} UTC.`;
    } else {
      const activeCampaigns = await Campaign.find({ status: "active" }).lean();
      let context = `Konteks data dari database:\n`;
      if (userProfile) {
        context += `- Akun Pengguna Terhubung:\n`;
        context += `  * Username: @${userProfile.username}\n`;
        context += `  * Nickname: ${userProfile.nickname || "N/A"}\n`;
        context += `  * Tier: ${userProfile.tier || "bronze"}\n`;
        context += `  * Saldo Campaign: $${(userProfile.campaignBalance || 0).toFixed(2)}\n`;
        context += `  * Saldo Referral: $${(userProfile.referralBalance || 0).toFixed(2)}\n`;
        context += `  * Total Video: ${userProfile.stats?.totalVideos || 0}\n`;
        context += `  * Total Views: ${userProfile.stats?.totalViews || 0}\n`;
      } else {
        context += `- Akun Pengguna: Akun Discord Anda belum terhubung ke platform RuneClipy. Anda dapat mengetik command /link untuk menghubungkannya terlebih dahulu.\n`;
      }
      
      context += `- Daftar Campaign Aktif saat ini:\n`;
      if (activeCampaigns.length > 0) {
        activeCampaigns.forEach(c => {
          context += `  * ${c.title} (Rate per view: $${c.ratePerView || 0}, Budget tersisa: $${(c.budget - (c.spent || 0)).toFixed(2)})\n`;
        });
      } else {
        context += `  * Tidak ada campaign aktif saat ini.\n`;
      }

      systemInstruction = `Kamu adalah Mimin, asisten virtual PINTAR dan ramah dari RuneClipy di Discord.
Tugas Anda adalah melayani dan menjawab pertanyaan dari USER BIASA terkait data akun mereka dan campaign yang aktif berdasarkan konteks data berikut.

GAYA KOMUNIKASI WAJIB:
1. Sangat Manusiawi dan Santai: Jangan kaku. Bicara seperti orang biasa yang ramah di chat Discord. Gunakan sapaan "Kak" secara natural. Pakai kata-kata kasual: oke, siap, oh iya, btw, deh, kok, nih, ya, dong, dll.
2. Rapi dan alami: Gunakan emoji secara informatif dan baris baru yang bersih.
3. JANGAN melayani perintah administratif seperti mengedit data, mengubah status, menghapus data, atau memberikan informasi rahasia sistem. Jika diminta hal tersebut, tolak secara sopan.
4. Bicaralah dengan ramah, informatif, dan ringkas. JANGAN berbohong atau berhalusinasi di luar konteks data yang disediakan.

---
[INFO WAKTU SEKARANG]:
Waktu saat ini adalah: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB.

---
${context}`;
    }

    const reply = await runBotAIChat(settings, cleanHistory, message.content, systemInstruction, isAdmin, message.author.id, message.author.tag);
    
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(reply);
    }
  } catch (err) {
    console.error("[Bot AI chat error]:", err);
    try {
      await message.reply(`❌ Terjadi error saat memproses chat AI: \`${err.message}\``);
    } catch (replyErr) {
      console.error("[Bot AI chat error] Failed to reply error to channel:", replyErr.message);
    }
  }
}

// ─── Bot Status ──────────────────────────────────────────
async function updateStatus(f) { await BotStatus.updateOne({ botType: "discord" }, { $set: f }, { upsert: true }); }

// ─── Bot Lifecycle ───────────────────────────────────────
let client = null, heartbeatTimer = null, pollTimer = null, autoTimer = null, matrixTimer = null;
let botStartedAt = null;

async function startBot() {
  if (client) { try { client.destroy(); } catch {} client = null; }
  await updateStatus({ status: "connecting", error: "", command: "idle" });
  botStartedAt = new Date();

  try {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    client.once(Events.ClientReady, async (c) => {
      console.log(`[Bot] ✅ ${c.user.tag} — ${c.guilds.cache.size} servers`);
      c.user.setActivity("RuneClipy 🔮 | /help", { type: ActivityType.Watching });
      await updateStatus({ status:"online", error:"", command:"idle", username:c.user.tag, avatar:c.user.displayAvatarURL(), guildCount:c.guilds.cache.size, ping:c.ws.ping, startedAt:new Date(), lastHeartbeat:new Date() });
      await registerCommands();
      startHeartbeat();
      startAutoSystems();
    });

    client.on(Events.InteractionCreate, handleInteraction);
    client.on(Events.MessageCreate, handleMessageCreate);

    // Welcome DM
    client.on(Events.GuildMemberAdd, async (member) => {
      try {
        const e = new EmbedBuilder().setColor(0x00D4AA).setTitle("🔮 Welcome to RuneClipy!")
          .setDescription(`Halo **${member.user.username}**! 👋\n\nRuneClipy adalah platform dimana kamu bisa **earn money** dari video TikTok-mu! 🎵💰`)
          .addFields(
            { name: "🚀 Getting Started", value: "1. Register di web\n2. Link Discord\n3. Submit video ke campaign\n4. Earn money!" },
            { name: "🌐 Website", value: "[runeclipy.vercel.app](https://runeclipy.vercel.app)" },
            { name: "📖 Commands", value: "Ketik `/help` di server" },
          ).setFooter({ text: "RuneClipy 🔮 — Earn from your creativity" }).setTimestamp();
        await member.send({ embeds: [e] });
      } catch {}
    });

    client.on(Events.GuildCreate, async (g) => {
      const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
      try { await rest.put(Routes.applicationGuildCommands(CLIENT_ID, g.id), { body: allCommands.map(c=>c.toJSON()) }); } catch {}
      await updateStatus({ guildCount: client.guilds.cache.size });
    });

    client.on(Events.Error, async (e) => { await updateStatus({ error: e.message }); });

    await client.login(BOT_TOKEN);
  } catch (err) {
    console.error("[Bot] ❌", err.message);
    await updateStatus({ status:"error", error:err.message, command:"idle" });
    client = null;
  }
}

async function stopBot() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  if (matrixTimer) { clearInterval(matrixTimer); matrixTimer = null; }
  if (client) { try { client.destroy(); } catch {} client = null; }
  await updateStatus({ status:"offline", error:"", command:"idle", startedAt:null, username:"", avatar:"", guildCount:0, ping:0 });
}

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    if (client?.ws.status === 0) await updateStatus({ lastHeartbeat: new Date(), ping: client.ws.ping, guildCount: client.guilds.cache.size });
  }, HEARTBEAT_INTERVAL);
}

function startAutoSystems() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(async () => {
    await autoNotifyCampaigns();
    await autoNotifySubmissions();
    await autoSyncRoles();
  }, AUTO_CHECK_INTERVAL);

  if (matrixTimer) clearInterval(matrixTimer);
  matrixTimer = setInterval(async () => {
    await autoStreamMatrixEvents();
  }, 10000); // Poll matrix events every 10 seconds

  // Run once immediately
  setTimeout(async () => {
    await autoNotifyCampaigns();
    await autoNotifySubmissions();
    await autoSyncRoles();
    await autoStreamMatrixEvents();
  }, 5000);
}

async function autoStreamMatrixEvents() {
  try {
    if (!client) return;
    const guildId = await getGuildId();
    if (!guildId) return;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    // 1. Locate or create Matrix Live Activity Stream Channel
    const settings = await SiteSetting.findOne().lean();
    let channel = null;

    if (settings?.discordMatrixChannelId) {
      channel = await client.channels.fetch(settings.discordMatrixChannelId).catch(() => null);
    }

    if (!channel) {
      // Find by name "rune-matrix"
      channel = guild.channels.cache.find(c => c.name === "rune-matrix" && c.type === 0);
    }

    if (!channel) {
      try {
        channel = await guild.channels.create({
          name: "rune-matrix",
          type: 0, // GuildText
          topic: "🔮 Cybernetic Live Activity Stream — Project Rune",
          reason: "Automatically created Rune Matrix stream channel"
        });
        console.log("[Matrix] ✅ Automatically created channel #rune-matrix");
      } catch (err) {
        console.error("[Matrix] ⚠️ Can't create #rune-matrix channel:", err.message);
        // Fallback to discordNotifChannelId
        const fbChannelId = settings?.discordNotifChannelId;
        if (fbChannelId) {
          channel = await client.channels.fetch(fbChannelId).catch(() => null);
        }
      }
    }
    if (!channel) return;

    // Filter documents created after bot startup to prevent startup flood
    const startupFilter = { createdAt: { $gt: botStartedAt } };

    // 2. Poll & Stream New Users
    const newUsers = await User.find({ notifiedMatrix: { $ne: true }, ...startupFilter }).limit(5);
    for (const u of newUsers) {
      const emailMasked = u.email ? u.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "N/A";
      const embed = new EmbedBuilder()
        .setColor(0x00FF66)
        .setTitle("🟢 [ NODE CONNECTED ]")
        .setDescription(`\`\`\`ini\n┌── ACCESS GRANTED ────────────────────────\n│ 👤 Username : @${u.username || "unknown"}\n│ 📧 Email    : ${emailMasked}\n│ 🔗 Discord  : ${u.discordUsername ? `@${u.discordUsername}` : "Not Linked"}\n│ 🛡️ Status   : ${u.isBanned ? "BANNED" : "ACTIVE"}\n└──────────────────────────────────────────\n\`\`\``)
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      await User.updateOne({ _id: u._id }, { $set: { notifiedMatrix: true } });
    }

    // 3. Poll & Stream New Transactions
    const newTx = await Transaction.find({ notifiedMatrix: { $ne: true }, ...startupFilter }).limit(5);
    for (const t of newTx) {
      const u = await User.findById(t.userId).lean();
      const isEarning = t.type === "campaign_earning" || t.type === "referral_earning";
      const embed = new EmbedBuilder()
        .setColor(isEarning ? 0xFFD700 : 0x00CCFF)
        .setTitle(isEarning ? "🪙 [ TRANSACTION COMPLETED ]" : "💎 [ TRANSACTION SYNCED ]")
        .setDescription(`\`\`\`ini\n┌── QUANTUM FINANCIAL WAVE ────────────────\n│ 👤 Account  : @${u?.username || "unknown"}\n│ 💰 Amount   : ${fmtCurrency(t.amount)}\n│ 📝 Type     : ${t.type.toUpperCase()}\n│ ⚡ Status   : ${t.status?.toUpperCase() || "SUCCESS"}\n│ 🌐 Info     : ${t.description || "N/A"}\n└──────────────────────────────────────────\n\`\`\``)
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      await Transaction.updateOne({ _id: t._id }, { $set: { notifiedMatrix: true } });
    }

    // 4. Poll & Stream New Activity Logs (Admin/Mod actions)
    const newLogs = await ActivityLog.find({ notifiedMatrix: { $ne: true }, ...startupFilter }).limit(5);
    for (const l of newLogs) {
      const embed = new EmbedBuilder()
        .setColor(0x9900FF)
        .setTitle("🛡️ [ ADMIN PROTOCOL ACTIVATED ]")
        .setDescription(`\`\`\`ini\n┌── SECURITY PROTOCOL V1 ──────────────────\n│ 👤 Operator : @${l.actor || "admin"}\n│ ⚡ Action   : ${l.action.toUpperCase()}\n│ 📝 Details  : ${l.details || "N/A"}\n│ 🔐 Scope    : ${l.targetType?.toUpperCase() || "SYSTEM"}\n└──────────────────────────────────────────\n\`\`\``)
        .setTimestamp();
      await channel.send({ embeds: [embed] });
      await ActivityLog.updateOne({ _id: l._id }, { $set: { notifiedMatrix: true } });
    }
  } catch (err) {
    console.error("[Matrix] Stream error:", err.message);
  }
}

async function pollCommands() {
  try {
    const d = await BotStatus.findOne({ botType: "discord" });
    if (!d) return;
    if (d.command==="stop") await stopBot();
    else if (d.command==="restart") { await stopBot(); await new Promise(r=>setTimeout(r,1000)); await startBot(); }
    else if (d.command==="start") { if (!client) await startBot(); else await updateStatus({ command:"idle" }); }
  } catch {}
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  RuneClipy Bot v4 — Full Feature Suite");
  console.log("═══════════════════════════════════════════");
  await mongoose.connect(MONGODB_URI);
  console.log("[Bot] ✅ MongoDB connected");
  await updateStatus({ error: "", command: "idle" });
  await startBot();
  pollTimer = setInterval(pollCommands, POLL_INTERVAL);
}

process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
async function shutdown() {
  if (pollTimer) clearInterval(pollTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (autoTimer) clearInterval(autoTimer);
  if (matrixTimer) clearInterval(matrixTimer);
  if (client) { try { client.destroy(); } catch {} }
  await updateStatus({ status:"offline", command:"idle", startedAt:null });
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error("[Bot] Fatal:", e); process.exit(1); });
