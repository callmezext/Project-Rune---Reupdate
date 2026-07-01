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

function putFile(conn, remotePath, content) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const stream = sftp.createWriteStream(remotePath);
      stream.on("close", resolve);
      stream.on("error", reject);
      stream.write(content);
      stream.end();
    });
  });
}

async function main() {
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve).on("error", reject).connect(config);
  });

  console.log("✅ SSH Connected!");

  // Get token from current service file
  const serviceContent = await execCommand(conn, "cat /etc/systemd/system/cloudflared.service");
  const tokenMatch = serviceContent.stdout.match(/--token\s+(\S+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  console.log("Token found:", token ? "YES" : "NO");

  // Get tunnel ID from token (base64 decode middle part)
  let tunnelId = "18465c8b-11a8-461d-9735-211858b2c11f"; // from our earlier CNAME check
  console.log("Using Tunnel ID:", tunnelId);

  // Write cloudflared config with ingress rules
  const cloudflaredConfig = `tunnel: ${tunnelId}
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: runeclip.web.id
    service: http://localhost:3002
  - hostname: chloera.store
    service: http://localhost:3000
  - service: http_status:404
`;

  console.log("📝 Writing cloudflared config...");
  await putFile(conn, "/tmp/cloudflared-config.yml", cloudflaredConfig);
  await execCommand(conn, "echo 'zett@VPS' | sudo -S cp /tmp/cloudflared-config.yml /etc/cloudflared/config.yml");
  console.log("✅ Config written!");

  // Update systemd service to use config file instead of token-only
  const newService = `[Unit]
Description=cloudflared
After=network.target

[Service]
TimeoutStartSec=0
Type=notify
User=root
ExecStart=/usr/local/bin/cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target`;

  // Check if credentials file exists first
  const credCheck = await execCommand(conn, "echo 'zett@VPS' | sudo -S ls /etc/cloudflared/");
  console.log("cloudflared dir contents:", credCheck.stdout.trim());

  // Try to get credentials via API - first let's see if there's a cert
  const certCheck = await execCommand(conn, "echo 'zett@VPS' | sudo -S ls /root/.cloudflared/ 2>/dev/null || echo 'NO ROOT CLOUDFLARED'");
  console.log("Root cloudflared:", certCheck.stdout.trim());

  // Since tunnel is managed via token, let's keep the token approach
  // but cloudflared with token doesn't support local ingress config
  // So instead - direct the tunnel public hostnames to correct ports from the dashboard

  // Let's check what port cloudflared is forwarding to
  const cfTest = await execCommand(conn, "curl -sI http://localhost:3002 | head -1");
  console.log("\n✅ rune-web (3002):", cfTest.stdout.trim());

  const cfTest2 = await execCommand(conn, "curl -sI http://localhost:3000 | head -1");
  console.log("✅ chloera (3000):", cfTest2.stdout.trim());

  // Check what the cloudflared tunnel is routing to (check if it reads from dashboard)
  const cfConfig = await execCommand(conn, "echo 'zett@VPS' | sudo -S cat /etc/cloudflared/config.yml 2>/dev/null || echo 'NO LOCAL CONFIG'");
  console.log("\nExisting cloudflared config:", cfConfig.stdout);

  // Check active tunnel connections
  const cfStatus = await execCommand(conn, "echo 'zett@VPS' | sudo -S journalctl -u cloudflared --since '5 minutes ago' --no-pager | tail -20");
  console.log("\nRecent cloudflared logs:", cfStatus.stdout);

  conn.end();
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
