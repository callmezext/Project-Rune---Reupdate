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
    const psCheck = await execCommand("ps aux | grep cloudflared");
    console.log("--- ps aux cloudflared ---");
    console.log(psCheck.stdout || psCheck.stderr);

    const systemdCheck = await execCommand("systemctl status cloudflared");
    console.log("--- systemd cloudflared ---");
    console.log(systemdCheck.stdout || systemdCheck.stderr);

    const checkDir1 = await execCommand("ls -la /etc/cloudflared/");
    console.log("--- /etc/cloudflared/ ---");
    console.log(checkDir1.stdout || checkDir1.stderr);

    const checkDir2 = await execCommand("ls -la /home/ubuntu/.cloudflared/");
    console.log("--- /home/ubuntu/.cloudflared/ ---");
    console.log(checkDir2.stdout || checkDir2.stderr);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
