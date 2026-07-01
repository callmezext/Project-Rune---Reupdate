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

const localNginxFile = path.join(__dirname, "runeclip.nginx");
const remoteTempNginx = "/home/ubuntu/runeclip.nginx";

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

    // 1. Upload local runeclip.nginx via SFTP
    console.log("📤 Uploading Nginx configuration file...");
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(localNginxFile, remoteTempNginx, {}, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
    console.log("✅ Nginx file uploaded to remote temp path!");

    // 2. Move file using sudo
    console.log("✍️ Moving config to Nginx sites-available directory...");
    const moveRes = await execCommand("echo 'zett@VPS' | sudo -S mv /home/ubuntu/runeclip.nginx /etc/nginx/sites-available/runeclip.web.id");
    if (moveRes.code !== 0) throw new Error(`Failed to move file: ${moveRes.stderr}`);

    // 3. Symlink config
    console.log("🔗 Creating Nginx configuration symlink...");
    const linkRes = await execCommand("echo 'zett@VPS' | sudo -S ln -sf /etc/nginx/sites-available/runeclip.web.id /etc/nginx/sites-enabled/");
    if (linkRes.code !== 0) throw new Error(`Failed to create symlink: ${linkRes.stderr}`);

    // 4. Test Nginx syntax
    console.log("🔍 Running Nginx config check (nginx -t)...");
    const testRes = await execCommand("echo 'zett@VPS' | sudo -S nginx -t");
    console.log(testRes.stdout || testRes.stderr);
    if (testRes.code !== 0) throw new Error("Nginx syntax check failed!");

    // 5. Reload Nginx
    console.log("🔄 Reloading Nginx server...");
    const reloadRes = await execCommand("echo 'zett@VPS' | sudo -S systemctl reload nginx");
    if (reloadRes.code !== 0) throw new Error(`Failed to reload Nginx: ${reloadRes.stderr}`);
    console.log("✅ Nginx reloaded successfully!");

  } catch (err) {
    console.error("🔴 Error fixing Nginx:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
