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
    const ustatus = await execCommand("systemctl status cloudflared --no-pager");
    console.log("--- cloudflared Status ---");
    console.log(ustatus.stdout);

    const accessLogs = await execCommand("echo 'zett@VPS' | sudo -S tail -n 10 /var/log/nginx/access.log");
    console.log("--- Nginx Access Logs ---");
    console.log(accessLogs.stdout);

    const errorLogs = await execCommand("echo 'zett@VPS' | sudo -S tail -n 10 /var/log/nginx/error.log");
    console.log("--- Nginx Error Logs ---");
    console.log(errorLogs.stdout);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
