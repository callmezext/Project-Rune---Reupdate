const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const conn = new Client();

const config = {
  host: "157.66.55.188",
  port: 18174,
  username: "ubuntu",
  password: "zett@VPS"
};

const localBotPath = path.join(__dirname, "bot.js");
const remoteDir = "/home/ubuntu/rune-dc";
const remoteBotPath = `${remoteDir}/bot.js`;

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`Executing remote command: ${cmd}`);
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
  console.log("⚡ SSH Connection Ready!");
  try {
    // 1. Create remote directory if not exists
    const mkdirRes = await execCommand(`mkdir -p ${remoteDir}`);
    console.log(`📁 Created remote dir (code: ${mkdirRes.code})`);

    // 2. Upload file using SFTP
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        console.log(`📤 Uploading ${localBotPath} to ${remoteBotPath}...`);
        sftp.fastPut(localBotPath, remoteBotPath, {}, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
    console.log("✅ File uploaded successfully!");

    // 3. Restart PM2 process on the VPS
    console.log("🔄 Restarting rune-dc process on PM2...");
    const pm2Res = await execCommand(`cd ${remoteDir} && pm2 restart rune-dc || pm2 start bot.js --name rune-dc`);
    console.log("--- PM2 Execution Stdout ---");
    console.log(pm2Res.stdout);
    if (pm2Res.stderr) {
      console.log("--- PM2 Execution Stderr ---");
      console.log(pm2Res.stderr);
    }
    console.log(`PM2 command finished with code ${pm2Res.code}`);

    // 4. Fetch status
    const statusRes = await execCommand("pm2 status");
    console.log("--- PM2 Status ---");
    console.log(statusRes.stdout);

  } catch (err) {
    console.error("🔴 Error during deployment:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).on("close", () => {
  console.log("🔒 Connection closed");
}).connect(config);
