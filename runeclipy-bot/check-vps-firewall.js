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
    const ufwStatus = await execCommand("echo 'zett@VPS' | sudo -S ufw status");
    console.log("--- UFW status ---");
    console.log(ufwStatus.stdout || ufwStatus.stderr);

    const iptables = await execCommand("echo 'zett@VPS' | sudo -S iptables -L -n -v");
    console.log("--- iptables (first 20 lines) ---");
    console.log(iptables.stdout.split("\n").slice(0, 20).join("\n"));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
