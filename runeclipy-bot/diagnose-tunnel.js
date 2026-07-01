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

  console.log("✅ SSH Connected!");

  // Check cloudflared status
  const cfStatus = await execCommand(conn, "systemctl status cloudflared | grep Active");
  console.log("cloudflared:", cfStatus.stdout.trim());

  // Check nginx status  
  const nginxStatus = await execCommand(conn, "systemctl status nginx | grep Active");
  console.log("nginx:", nginxStatus.stdout.trim());

  // Show nginx sites-enabled
  const sites = await execCommand(conn, "ls -la /etc/nginx/sites-enabled/");
  console.log("\n--- sites-enabled ---");
  console.log(sites.stdout);

  // Show runeclip config content
  const runeConf = await execCommand(conn, "cat /etc/nginx/sites-enabled/runeclip.web.id");
  console.log("--- runeclip.web.id nginx config ---");
  console.log(runeConf.stdout || runeConf.stderr);

  // Show chloera config content
  const chloeraConf = await execCommand(conn, "cat /etc/nginx/sites-enabled/chloera.store 2>/dev/null || echo 'NO CONFIG'");
  console.log("--- chloera.store nginx config ---");
  console.log(chloeraConf.stdout);

  // Check nginx error log
  const errLog = await execCommand(conn, "echo 'zett@VPS' | sudo -S tail -n 15 /var/log/nginx/error.log");
  console.log("--- Nginx error log ---");
  console.log(errLog.stdout);

  // cloudflared last logs
  const cfLog = await execCommand(conn, "echo 'zett@VPS' | sudo -S journalctl -u cloudflared -n 15 --no-pager");
  console.log("--- cloudflared logs ---");
  console.log(cfLog.stdout);

  conn.end();
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
