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
    const rootCheck = await execCommand("echo 'zett@VPS' | sudo -S ls -la /root/.cloudflared/");
    console.log("--- /root/.cloudflared/ ---");
    console.log(rootCheck.stdout || rootCheck.stderr);

    const rootConfigCheck = await execCommand("echo 'zett@VPS' | sudo -S find /etc -name \"*cloudflared*\"");
    console.log("--- find cloudflared in /etc ---");
    console.log(rootConfigCheck.stdout || rootConfigCheck.stderr);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
