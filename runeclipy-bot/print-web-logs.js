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
    const errorLogs = await execCommand("echo 'zett@VPS' | sudo -S ss -lntp | grep 3002");
    console.log("--- Process occupying Port 3002 ---");
    console.log(errorLogs.stdout || errorLogs.stderr);

    const outLogs = await execCommand("tail -n 40 /home/ubuntu/.pm2/logs/rune-web-out.log");
    console.log("--- PM2 Out Logs ---");
    console.log(outLogs.stdout || outLogs.stderr);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
