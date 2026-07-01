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

    // 1. Allow port 80/tcp
    console.log("🔓 Allowing port 80/tcp in firewall...");
    const allow80 = await execCommand("echo 'zett@VPS' | sudo -S ufw allow 80/tcp");
    console.log(allow80.stdout || allow80.stderr);

    // 2. Allow port 443/tcp
    console.log("🔓 Allowing port 443/tcp in firewall...");
    const allow443 = await execCommand("echo 'zett@VPS' | sudo -S ufw allow 443/tcp");
    console.log(allow443.stdout || allow443.stderr);

    // 3. Reload firewall
    console.log("🔄 Reloading UFW firewall...");
    const reloadRes = await execCommand("echo 'zett@VPS' | sudo -S ufw reload");
    console.log(reloadRes.stdout || reloadRes.stderr);

    // 4. Print new status
    const statusRes = await execCommand("echo 'zett@VPS' | sudo -S ufw status");
    console.log("--- New UFW Status ---");
    console.log(statusRes.stdout);

  } catch (err) {
    console.error("🔴 Error configuring firewall:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
