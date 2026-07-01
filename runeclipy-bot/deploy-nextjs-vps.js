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

const remoteWebDir = "/home/ubuntu/rune-web";
const remoteNextDir = `${remoteWebDir}/runeclipy`;

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
    console.log("⚡ SSH Connection Established!");

    // 1. Clone repository if not exists, otherwise pull latest
    const checkDir = await execCommand(`ls -la ${remoteWebDir}`);
    if (checkDir.code !== 0) {
      console.log("📁 rune-web folder not found. Cloning repository...");
      const cloneRes = await execCommand(`git clone https://github.com/callmezext/Project-Rune---Reupdate.git ${remoteWebDir}`);
      if (cloneRes.code !== 0) throw new Error(`Git clone failed: ${cloneRes.stderr}`);
      console.log("✅ Git clone success!");
    } else {
      console.log("📁 rune-web folder exists. Pulling latest commits...");
      const pullRes = await execCommand(`cd ${remoteWebDir} && git reset --hard && git pull`);
      if (pullRes.code !== 0) throw new Error(`Git pull failed: ${pullRes.stderr}`);
      console.log("✅ Git pull success!");
    }

    // 2. Read Bot .env variables on VPS to copy MongoDB and Discord secrets
    console.log("📖 Extracting environment variables from bot .env...");
    const readEnv = await execCommand("cat /home/ubuntu/rune-dc/.env");
    if (readEnv.code !== 0) throw new Error("Could not read bot .env file on VPS");

    let mongoUri = "";
    let botToken = "";
    let clientId = "";
    let guildId = "";

    readEnv.stdout.split("\n").forEach(line => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim();
        if (key === "MONGODB_URI") mongoUri = val;
        if (key === "DISCORD_BOT_TOKEN") botToken = val;
        if (key === "DISCORD_CLIENT_ID") clientId = val;
        if (key === "DISCORD_GUILD_ID") guildId = val;
      }
    });

    if (!mongoUri || !botToken) throw new Error("Missing MONGODB_URI or DISCORD_BOT_TOKEN in bot .env");
    console.log("✅ Extracted config variables successfully!");

    // 3. Create Web app .env file
    console.log("✍️ Creating .env file for Next.js web application...");
    const sessionSecret = require("crypto").randomBytes(32).toString("hex");
    const webEnvContent = [
      `MONGODB_URI=${mongoUri}`,
      `DISCORD_BOT_TOKEN=${botToken}`,
      `DISCORD_CLIENT_ID=${clientId}`,
      `DISCORD_GUILD_ID=${guildId}`,
      `SESSION_SECRET=${sessionSecret}`,
      `NEXT_PUBLIC_APP_URL=https://runeclip.web.id`,
      `NEXTAUTH_URL=https://runeclip.web.id`,
      `NODE_ENV=production`
    ].join("\n");

    const writeEnvRes = await execCommand(`cat << 'EOF' > ${remoteNextDir}/.env\n${webEnvContent}\nEOF`);
    if (writeEnvRes.code !== 0) throw new Error(`Failed to write .env file: ${writeEnvRes.stderr}`);
    console.log("✅ Next.js .env file created!");

    // 4. Install dependencies
    console.log("📦 Installing npm packages (this may take a moment)...");
    const installRes = await execCommand(`cd ${remoteNextDir} && npm install --production=false`);
    if (installRes.code !== 0) {
      console.warn("Npm install warning/error:", installRes.stderr);
    }
    console.log("✅ Dependencies installed!");

    // 5. Build Next.js project
    console.log("🚀 Building Next.js app (npm run build)...");
    const buildRes = await execCommand(`cd ${remoteNextDir} && npm run build`);
    console.log(buildRes.stdout);
    if (buildRes.code !== 0) throw new Error(`Next.js build failed: ${buildRes.stderr}`);
    console.log("✅ Next.js production build succeeded!");

    // 6. PM2 process launch
    console.log("⚙️ Launching Next.js on PM2 port 3001...");
    await execCommand("pm2 delete rune-web");
    const pm2Res = await execCommand(`cd ${remoteNextDir} && pm2 start npm --name "rune-web" -- start -- -p 3001`);
    if (pm2Res.code !== 0) throw new Error(`PM2 start failed: ${pm2Res.stderr}`);
    console.log("✅ Next.js started in PM2!");

    // 7. Write Nginx Configuration
    console.log("🌐 Setting up Nginx Server Block config...");
    const nginxConfig = `server {
    listen 80;
    server_name runeclip.web.id www.runeclip.web.id;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

    const writeNginxRes = await execCommand(`echo 'zett@VPS' | sudo -S bash -c "cat << 'EOF' > /etc/nginx/sites-available/runeclip.web.id\n${nginxConfig}\nEOF"`);
    if (writeNginxRes.code !== 0) throw new Error(`Failed to create Nginx config: ${writeNginxRes.stderr}`);
    console.log("✅ Nginx config written to sites-available!");

    // 8. Enable site (symlink)
    console.log("🔗 Linking Nginx configuration file...");
    const linkNginxRes = await execCommand("echo 'zett@VPS' | sudo -S ln -sf /etc/nginx/sites-available/runeclip.web.id /etc/nginx/sites-enabled/");
    if (linkNginxRes.code !== 0) throw new Error(`Failed to create Nginx symlink: ${linkNginxRes.stderr}`);
    console.log("✅ Nginx symlink created!");

    // 9. Reload Nginx
    console.log("🔄 Reloading Nginx server...");
    const reloadNginxRes = await execCommand("echo 'zett@VPS' | sudo -S systemctl reload nginx");
    if (reloadNginxRes.code !== 0) throw new Error(`Failed to reload Nginx: ${reloadNginxRes.stderr}`);
    console.log("✅ Nginx reloaded successfully!");

    // Show final status
    const statusRes = await execCommand("pm2 status");
    console.log("--- PM2 Final Status ---");
    console.log(statusRes.stdout);

    console.log("\n⭐️ DEPLOYMENT COMPLETED SUCCESSFULLY! ⭐️");

  } catch (err) {
    console.error("🔴 Error during Next.js VPS deployment:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH connection error:", err);
}).connect(config);
