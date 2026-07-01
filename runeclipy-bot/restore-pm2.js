const { Client } = require("ssh2");

const config = {
  host: "157.66.55.188",
  port: 18174,
  username: "ubuntu",
  password: "zett@VPS",
  readyTimeout: 30000,
  keepaliveInterval: 5000,
};

const conn = new Client();

function execCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = "", stderr = "";
      stream.on("data", d => stdout += d);
      stream.stderr.on("data", d => stderr += d);
      stream.on("close", () => resolve({ stdout, stderr }));
    });
  });
}

async function main() {
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect(config);
  });

  console.log("✅ SSH Connected! Restoring all PM2 services...");

  // Check if pm2 dump exists
  const dumpCheck = await execCommand(conn, "ls -la /home/ubuntu/.pm2/dump.pm2 2>/dev/null || echo 'NO DUMP'");
  console.log("PM2 dump:", dumpCheck.stdout.trim());

  // Try resurrect first
  console.log("\n🔄 Trying pm2 resurrect...");
  const resurrect = await execCommand(conn, "pm2 resurrect");
  console.log(resurrect.stdout || resurrect.stderr);

  await new Promise(r => setTimeout(r, 3000));

  // Check pm2 list after resurrect
  const pm2List = await execCommand(conn, "pm2 list --no-color");
  console.log("\n--- PM2 Status after resurrect ---");
  console.log(pm2List.stdout);

  // Check if rune-web is running
  const runeCheck = await execCommand(conn, "curl -sI http://localhost:3002 | head -1");
  const chloeraCheck = await execCommand(conn, "curl -sI http://localhost:3000 | head -1");
  console.log("\n--- rune-web (3002):", runeCheck.stdout.trim() || "NOT RUNNING");
  console.log("--- chloera-store (3000):", chloeraCheck.stdout.trim() || "NOT RUNNING");

  // If still not running, start manually
  if (!runeCheck.stdout.includes("200")) {
    console.log("\n⚠️ rune-web not running! Checking directory...");
    const dirCheck = await execCommand(conn, "ls /home/ubuntu/rune-web 2>/dev/null || ls /home/ubuntu/ | grep rune");
    console.log(dirCheck.stdout || dirCheck.stderr);
  }

  if (!chloeraCheck.stdout.includes("200")) {
    console.log("\n⚠️ chloera-store not running! Checking directory...");
    const dirCheck = await execCommand(conn, "ls /home/ubuntu/chloera-store 2>/dev/null || echo 'NOT FOUND'");
    console.log(dirCheck.stdout || dirCheck.stderr);
  }

  conn.end();
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
