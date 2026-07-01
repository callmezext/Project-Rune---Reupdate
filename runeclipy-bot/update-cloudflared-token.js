const { Client } = require("ssh2");
const conn = new Client();

const config = {
  host: "157.66.55.188",
  port: 18174,
  username: "ubuntu",
  password: "zett@VPS"
};

const newToken = "eyJhIjoiOGRkODUxODBkMGViMGEwY2M3YWU0NzI2Zjk0ODA0NjgiLCJ0IjoiMTg0NjVjOGItMTFhOC00NjFkLTk3MzUtMjExODU4YjJjMTFmIiwicyI6Ik1XRmlNRFUxT0dNdE1qa3hNeTAwTW1RNUxXRTBOell0WkRNd09UVXdZVGcxTW1NMCJ9";

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

    // 1. Write the new systemd file
    console.log("✍️ Updating cloudflared systemd service configuration...");
    const serviceContent = `[Unit]
Description=cloudflared
After=network.target

[Service]
TimeoutStartSec=0
Type=notify
User=root
ExecStart=/usr/local/bin/cloudflared --no-autoupdate tunnel run --token ${newToken}
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target`;

    const writeRes = await execCommand(`echo 'zett@VPS' | sudo -S bash -c "cat << 'EOF' > /etc/systemd/system/cloudflared.service\n${serviceContent}\nEOF"`);
    if (writeRes.code !== 0) throw new Error(`Failed to write service file: ${writeRes.stderr}`);
    console.log("✅ systemd service file updated!");

    // 2. Reload daemon
    console.log("🔄 Reloading systemd daemon...");
    const daemonRes = await execCommand("echo 'zett@VPS' | sudo -S systemctl daemon-reload");
    if (daemonRes.code !== 0) throw new Error(`Daemon reload failed: ${daemonRes.stderr}`);

    // 3. Restart service
    console.log("🔄 Restarting cloudflared service...");
    const restartRes = await execCommand("echo 'zett@VPS' | sudo -S systemctl restart cloudflared");
    if (restartRes.code !== 0) throw new Error(`Restart service failed: ${restartRes.stderr}`);
    console.log("✅ cloudflared restarted with new token!");

    // Wait 4 seconds to verify connection logs
    console.log("⏳ Waiting for 4 seconds to gather connection logs...");
    await new Promise(r => setTimeout(r, 4000));

    // 4. Check status and logs
    const statusRes = await execCommand("systemctl status cloudflared --no-pager");
    console.log("--- cloudflared Status ---");
    console.log(statusRes.stdout);

    const logRes = await execCommand("echo 'zett@VPS' | sudo -S journalctl -u cloudflared -n 25 --no-pager");
    console.log("--- Connection Logs ---");
    console.log(logRes.stdout);

  } catch (err) {
    console.error("🔴 Error updating token:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
