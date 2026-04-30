/**
 * Quick test script for TikTok modules (no Puppeteer)
 * Run: node test-tiktok.js
 */

const { scrapeTikTokProfile } = require("./modules/tiktok-stalk");
const { scrapeTikTokVideo } = require("./modules/tiktok-video");

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🔮 PROJECT RUNE — TikTok Module Test");
  console.log("  (No Puppeteer — HTTP Only)");
  console.log("═══════════════════════════════════════════════════\n");

  // Test 1: Profile Stalk
  console.log("━━━ TEST 1: Profile Stalk @zexocv2 ━━━\n");
  try {
    const profile = await scrapeTikTokProfile("zexocv2");
    console.log("\n📋 Profile Result:");
    console.log(JSON.stringify(profile, null, 2));
    console.log("\n✅ Profile stalk: SUCCESS\n");
  } catch (error) {
    console.log(`\n❌ Profile stalk FAILED: ${error.message}\n`);
  }

  console.log("\n" + "─".repeat(60) + "\n");

  // Test 2: Video Info
  console.log("━━━ TEST 2: Video Info ━━━\n");
  const videoUrl =
    "https://www.tiktok.com/@lutfiansyah4488/video/7631984535814753557";
  try {
    const video = await scrapeTikTokVideo(videoUrl);
    console.log("\n🎬 Video Result:");
    console.log(JSON.stringify(video, null, 2));
    console.log("\n✅ Video info: SUCCESS\n");
  } catch (error) {
    console.log(`\n❌ Video info FAILED: ${error.message}\n`);
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("  Tests Complete!");
  console.log("═══════════════════════════════════════════════════");
}

main().catch(console.error);
