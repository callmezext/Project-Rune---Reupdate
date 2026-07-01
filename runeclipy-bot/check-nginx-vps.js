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
    const checkNginx = await execCommand("cat /etc/nginx/sites-available/chloera.store");
    console.log("--- chloera.store Nginx Config ---");
    console.log(checkNginx.stdout || checkNginx.stderr);

    const listSites = await execCommand("ls -la /etc/nginx/sites-enabled/");
    console.log("--- Nginx Enabled Sites ---");
    console.log(listSites.stdout || listSites.stderr);

    const listWebDir = await execCommand("ls -la /home/ubuntu/");
    console.log("--- /home/ubuntu Directory ---");
    console.log(listWebDir.stdout || listWebDir.stderr);

  } catch (err) {
    console.error("Error checking Nginx:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
