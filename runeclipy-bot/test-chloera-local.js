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
    console.log("⚡ Connected to VPS...");
    const curlLocal = await execCommand("curl -I http://127.0.0.1:3000");
    console.log("--- Local 127.0.0.1:3000 Response ---");
    console.log(curlLocal.stdout || curlLocal.stderr);

    const pm2Logs = await execCommand("pm2 logs chloera-store --lines 20 --no-colors");
    console.log("--- PM2 logs chloera-store ---");
    console.log(pm2Logs.stdout || pm2Logs.stderr);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
