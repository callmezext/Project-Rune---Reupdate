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
    
    console.log("\n--- Checking Nginx status ---");
    const nginxCheck = await execCommand("systemctl status nginx | grep Active");
    console.log(nginxCheck.stdout.trim());

    console.log("\n--- Checking cloudflared status ---");
    const cfCheck = await execCommand("systemctl status cloudflared | grep Active");
    console.log(cfCheck.stdout.trim());

    console.log("\n--- Checking Next.js app (rune-web) response on localhost:3002 ---");
    const runeCheck = await execCommand("curl -I http://localhost:3002");
    console.log(runeCheck.stdout.split("\n")[0]); // Print HTTP response code

    console.log("\n--- Checking Chloera app (chloera-store) response on localhost:3000 ---");
    const chloeraCheck = await execCommand("curl -I http://localhost:3000");
    console.log(chloeraCheck.stdout.split("\n")[0]); // Print HTTP response code

    console.log("\n--- Checking Nginx host routing for runeclip.web.id ---");
    const nginxRune = await execCommand('curl -I -H "Host: runeclip.web.id" http://127.0.0.1/');
    console.log(nginxRune.stdout.split("\n")[0]);

    console.log("\n--- Checking Nginx host routing for chloera.store ---");
    const nginxChloera = await execCommand('curl -I -H "Host: chloera.store" http://127.0.0.1/');
    console.log(nginxChloera.stdout.split("\n")[0]);

  } catch (err) {
    console.error("Error verifying deployment:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
