/**
 * Debug: check what TikTok returns for @zexocv2
 */
const axios = require("axios");

async function debug() {
  const username = "zexocv2";
  const url = `https://www.tiktok.com/@${username}`;

  console.log(`Fetching: ${url}\n`);

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = res.data;
    console.log("Response length:", html.length);
    console.log("Status:", res.status);
    console.log();

    // Check for user-not-found indicators
    const checks = [
      "Couldn't find this account",
      "user-not-found",
      '"statusCode":10202',
      '"statusCode":10221',
      '"statusCode":0',
      '__UNIVERSAL_DATA_FOR_REHYDRATION__',
      'SIGI_STATE',
      '"uniqueId"',
      '"followerCount"',
      '"webapp.user-detail"',
    ];

    for (const check of checks) {
      console.log(`Contains "${check}": ${html.includes(check)}`);
    }

    // Extract the UNIVERSAL_DATA if present
    const match = html.match(/<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (match) {
      try {
        const json = JSON.parse(match[1]);
        const defaultScope = json?.__DEFAULT_SCOPE__;
        console.log("\nDefault Scope keys:", Object.keys(defaultScope || {}));
        
        const userDetail = defaultScope?.["webapp.user-detail"];
        console.log("\nwebapp.user-detail:", JSON.stringify(userDetail, null, 2).substring(0, 2000));
      } catch (e) {
        console.log("\nFailed to parse JSON:", e.message);
      }
    } else {
      console.log("\nNo UNIVERSAL_DATA script found");
      // Show a snippet of the HTML
      console.log("\nHTML snippet (first 3000 chars):");
      console.log(html.substring(0, 3000));
    }
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

debug();
