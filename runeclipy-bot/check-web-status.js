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
    const pm2Status = await execCommand("pm2 status");
    console.log("--- PM2 Status ---");
    console.log(pm2Status.stdout);

    const curlRes = await execCommand("curl -I http://localhost:3001");
    console.log("--- Localhost 3001 Curl ---");
    console.log(curlRes.stdout || curlRes.stderr);

    const pm2Logs = await execCommand("pm2 logs rune-web --lines 50 --err");
    console.log("--- PM2 Logs rune-web ---");
    console.log(pm2Logs.stdout || pm2Logs.stderr);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
