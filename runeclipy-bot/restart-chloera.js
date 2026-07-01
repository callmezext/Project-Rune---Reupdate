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
    console.log("🔄 Restarting chloera-store in PM2...");
    const restartRes = await execCommand("pm2 restart chloera-store");
    console.log(restartRes.stdout || restartRes.stderr);

    // Wait 3 seconds
    await new Promise(r => setTimeout(r, 3000));

    const checkStatus = await execCommand("pm2 show chloera-store");
    console.log("--- chloera-store details ---");
    console.log(checkStatus.stdout);

    const curlRes = await execCommand("curl -I http://127.0.0.1:3000");
    console.log("--- Curl response ---");
    console.log(curlRes.stdout || curlRes.stderr);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
