const { Client } = require("ssh2");
const conn = new Client();

const config = {
  host: "157.66.55.188",
  port: 18174,
  username: "ubuntu",
  password: "zett@VPS"
};

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`[SSH EXEC] ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream.on("data", (data) => { stdout += data.toString(); });
      stream.stderr.on("data", (data) => { stderr += data.toString(); });
      stream.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });
    });
  });
}

conn.on("ready", async () => {
  try {
    console.log("⚡ SSH Connected...");

    // Delete existing rune-web process
    console.log("🗑️ Deleting old PM2 process...");
    await execCommand("pm2 delete rune-web");

    // Start rune-web using /usr/bin/npm with explicit --cwd
    console.log("🚀 Starting Next.js app rune-web on port 3002...");
    const pm2Res = await execCommand('pm2 start /usr/bin/npm --name "rune-web" --cwd "/home/ubuntu/rune-web/runeclipy" -- run start -- -p 3002');
    if (pm2Res.code !== 0) throw new Error(`PM2 failed to start: ${pm2Res.stderr}`);
    console.log("✅ Next.js started in PM2!");

    // Wait 3 seconds to check status
    console.log("⏳ Waiting for 3 seconds...");
    await new Promise(r => setTimeout(r, 3000));

    // Check status
    const statusRes = await execCommand("pm2 show rune-web");
    console.log("--- PM2 rune-web Details ---");
    console.log(statusRes.stdout);

    const curlRes = await execCommand("curl -I http://localhost:3002");
    console.log("--- Localhost 3002 Response ---");
    console.log(curlRes.stdout || curlRes.stderr);

  } catch (err) {
    console.error("🔴 Error starting web:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
