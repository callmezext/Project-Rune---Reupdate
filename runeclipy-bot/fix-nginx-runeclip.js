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

  // Write config via SFTP to avoid shell escaping issues
  const nginxConfig = `server {
    listen 80;
    server_name runeclip.web.id www.runeclip.web.id;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  console.log("✍️ Writing Nginx config via SFTP...");
  await putFile(conn, "/tmp/runeclip.web.id.nginx", nginxConfig);
  console.log("✅ File uploaded to /tmp/");

  // Move to sites-available and enable
  await execCommand(conn, "echo 'zett@VPS' | sudo -S cp /tmp/runeclip.web.id.nginx /etc/nginx/sites-available/runeclip.web.id");
  await execCommand(conn, "echo 'zett@VPS' | sudo -S ln -sf /etc/nginx/sites-available/runeclip.web.id /etc/nginx/sites-enabled/runeclip.web.id");

  // Test nginx config
  const testRes = await execCommand(conn, "echo 'zett@VPS' | sudo -S nginx -t 2>&1");
  console.log("Nginx test:", testRes.stdout || testRes.stderr);

  if ((testRes.stdout + testRes.stderr).includes("test is successful")) {
    // Reload nginx
    const reloadRes = await execCommand(conn, "echo 'zett@VPS' | sudo -S systemctl reload nginx");
    console.log("Nginx reload:", reloadRes.stderr || "OK");

    // Verify routing
    const runeRoute = await execCommand(conn, 'curl -sI -H "Host: runeclip.web.id" http://localhost/');
    console.log("\n--- Nginx route runeclip.web.id ---");
    console.log(runeRoute.stdout.split("\n")[0]);

    const chloeraRoute = await execCommand(conn, 'curl -sI -H "Host: chloera.store" http://localhost/');
    console.log("\n--- Nginx route chloera.store ---");
    console.log(chloeraRoute.stdout.split("\n")[0]);

    // PM2 status
    const pm2 = await execCommand(conn, "pm2 list --no-color");
    console.log("\n--- PM2 Status ---");
    console.log(pm2.stdout);
  } else {
    console.log("❌ Nginx config still broken!");
    const errLog = await execCommand(conn, "echo 'zett@VPS' | sudo -S cat /etc/nginx/sites-enabled/runeclip.web.id");
    console.log("Current broken config:\n", errLog.stdout);
  }

  conn.end();
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
