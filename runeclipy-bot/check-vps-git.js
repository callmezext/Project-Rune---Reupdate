const { Client } = require("ssh2");
const conn = new Client();

const config = {
  host: "157.66.55.188",
  port: 18174,
  username: "ubuntu",
  password: "zett@VPS"
};

conn.on("ready", () => {
  console.log("⚡ Connected to VPS...");
  conn.exec("cd /home/ubuntu/chloera-store && git status", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    let stderr = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.stderr.on("data", (d) => { stderr += d.toString(); });
    stream.on("close", (code) => {
      console.log("--- Git Status in chloera-store ---");
      console.log("Exit Code:", code);
      console.log("STDOUT:\n", stdout);
      if (stderr) console.log("STDERR:\n", stderr);
      conn.end();
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
