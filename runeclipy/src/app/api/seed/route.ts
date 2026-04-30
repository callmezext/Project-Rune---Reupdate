import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    await connectDB();

    // Check if already seeded
    const existingCampaigns = await Campaign.countDocuments();
    if (existingCampaigns > 0) {
      return NextResponse.json({ message: "Already seeded", campaigns: existingCampaigns });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const adminUser = await User.findOneAndUpdate(
      { username: "admin" },
      {
        nickname: "Admin",
        username: "admin",
        email: "gunturafandy5@gmail.com",
        password: hashedPassword,
        role: "admin",
        referralCode: "admin",
        memberSince: new Date(),
      },
      { upsert: true, new: true }
    );

    // Create demo user
    const demoPassword = await bcrypt.hash("demo123", 12);
    await User.findOneAndUpdate(
      { username: "demo" },
      {
        nickname: "Demo Creator",
        username: "demo",
        email: "demo@runeclipy.com",
        password: demoPassword,
        role: "user",
        referralCode: "demo",
        memberSince: new Date(),
      },
      { upsert: true, new: true }
    );

    // Seed campaigns
    const campaigns = [
      {
        title: "Summer Vibes — Tropical Beat Campaign",
        slug: "summer-vibes-tropical-beat",
        type: "music",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop",
        description: "<p>Use our exclusive tropical beat in your summer content! Create fun, vibrant videos showing summer activities, beach vibes, and positive energy.</p><p><strong>Requirements:</strong> Use the full sound, minimum 15 seconds, original content only.</p>",
        totalBudget: 5000,
        budgetUsed: 1250,
        ratePerMillionViews: 130,
        maxEarningsPerCreator: 200,
        maxEarningsPerPost: 50,
        maxSubmissionsPerAccount: 5,
        minViews: 1000,
        totalCreators: 89,
        totalSubmissions: 234,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [
          { title: "Tropical Summer Beat", soundUrl: "https://www.tiktok.com/music/tropical-summer-123", videoReferenceUrl: "https://www.tiktok.com/@example/video/123" },
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Lo-Fi Study Session Promo",
        slug: "lofi-study-session",
        type: "music",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=400&fit=crop",
        description: "<p>Promote our new lo-fi study beats! Perfect for study vlogs, aesthetic content, and chill compilations.</p>",
        totalBudget: 3000,
        budgetUsed: 450,
        ratePerMillionViews: 150,
        maxEarningsPerCreator: 150,
        maxEarningsPerPost: 40,
        maxSubmissionsPerAccount: 3,
        minViews: 500,
        totalCreators: 42,
        totalSubmissions: 67,
        supportedPlatforms: ["tiktok"],
        contentType: "both",
        sounds: [
          { title: "Lo-Fi Chill Beats", soundUrl: "https://www.tiktok.com/music/lofi-chill-456", videoReferenceUrl: "" },
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Gaming Montage — Epic Sound",
        slug: "gaming-montage-epic",
        type: "clipping",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop",
        description: "<p>Create epic gaming montages using our sound! Show your best clips, highlights, and plays.</p>",
        totalBudget: 8000,
        budgetUsed: 3200,
        ratePerMillionViews: 100,
        maxEarningsPerCreator: 300,
        maxEarningsPerPost: 75,
        maxSubmissionsPerAccount: 5,
        minViews: 2000,
        totalCreators: 156,
        totalSubmissions: 489,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [
          { title: "Epic Gaming Drop", soundUrl: "https://www.tiktok.com/music/epic-gaming-789", videoReferenceUrl: "" },
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Fitness Motivation — Workout Beats",
        slug: "fitness-motivation-workout",
        type: "music",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop",
        description: "<p>Motivate your audience with our high-energy workout beats! Perfect for gym clips, transformation videos, and fitness tips.</p>",
        totalBudget: 4000,
        budgetUsed: 200,
        ratePerMillionViews: 120,
        maxEarningsPerCreator: 180,
        maxEarningsPerPost: 45,
        maxSubmissionsPerAccount: 4,
        minViews: 1500,
        totalCreators: 28,
        totalSubmissions: 45,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [
          { title: "Pump It Up Beats", soundUrl: "https://www.tiktok.com/music/pump-it-up-101", videoReferenceUrl: "" },
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Brand Logo Reveal — Creative Challenge",
        slug: "brand-logo-reveal",
        type: "logo",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop",
        description: "<p>Show off your creativity! Create a unique logo reveal using our provided assets and sound.</p>",
        totalBudget: 2000,
        budgetUsed: 600,
        ratePerMillionViews: 200,
        maxEarningsPerCreator: 100,
        maxEarningsPerPost: 50,
        maxSubmissionsPerAccount: 2,
        minViews: 3000,
        totalCreators: 35,
        totalSubmissions: 52,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [],
        createdBy: adminUser._id,
      },
      {
        title: "UGC Product Review — Tech Gadgets",
        slug: "ugc-product-review-tech",
        type: "ugc",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=400&fit=crop",
        description: "<p>Create authentic product review content for trending tech gadgets. Show unboxing, features, and your honest opinion.</p>",
        totalBudget: 6000,
        budgetUsed: 1800,
        ratePerMillionViews: 180,
        maxEarningsPerCreator: 250,
        maxEarningsPerPost: 60,
        maxSubmissionsPerAccount: 3,
        minViews: 1000,
        totalCreators: 67,
        totalSubmissions: 134,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [],
        createdBy: adminUser._id,
      },
      {
        title: "Chill Night Drive — Aesthetic Vibes",
        slug: "chill-night-drive",
        type: "music",
        status: "paused",
        coverImage: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=400&fit=crop",
        description: "<p>Create aesthetic night drive content using our chill beats. Perfect for car content, city lights, and moody vibes.</p>",
        totalBudget: 3500,
        budgetUsed: 3200,
        ratePerMillionViews: 140,
        maxEarningsPerCreator: 160,
        maxEarningsPerPost: 40,
        maxSubmissionsPerAccount: 3,
        minViews: 2000,
        totalCreators: 98,
        totalSubmissions: 267,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [
          { title: "Midnight Drive", soundUrl: "https://www.tiktok.com/music/midnight-drive-202", videoReferenceUrl: "" },
        ],
        createdBy: adminUser._id,
      },
      {
        title: "Dance Challenge — New Beat Drop",
        slug: "dance-challenge-new-beat",
        type: "music",
        status: "active",
        coverImage: "https://images.unsplash.com/photo-1547153760-18fc86c7aad3?w=600&h=400&fit=crop",
        description: "<p>Start the next viral dance challenge! Use our new beat drop and choreograph your own moves.</p>",
        totalBudget: 10000,
        budgetUsed: 4500,
        ratePerMillionViews: 110,
        maxEarningsPerCreator: 500,
        maxEarningsPerPost: 100,
        maxSubmissionsPerAccount: 10,
        minViews: 5000,
        totalCreators: 312,
        totalSubmissions: 876,
        supportedPlatforms: ["tiktok"],
        contentType: "video",
        sounds: [
          { title: "New Beat Drop 2026", soundUrl: "https://www.tiktok.com/music/new-beat-drop-303", videoReferenceUrl: "" },
        ],
        createdBy: adminUser._id,
      },
    ];

    await Campaign.insertMany(campaigns);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      data: {
        campaigns: campaigns.length,
        adminLogin: { email: "gunturafandy5@gmail.com", password: "admin123" },
        demoLogin: { email: "demo@runeclipy.com", password: "demo123" },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seeding failed", details: String(error) }, { status: 500 });
  }
}
