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
  conn.exec("tail -n 50 /home/ubuntu/.pm2/logs/chloera-bot-error.log", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- chloera-bot Errors ---");
      console.log(stdout || "(No errors in log)");
      conn.end();
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
