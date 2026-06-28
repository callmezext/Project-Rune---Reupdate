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
  conn.exec("cat /home/ubuntu/chloera-store/.env", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- chloera-store Root .env Content ---");
      // Let's filter out sensitive passwords just in case, but keep database structure
      console.log(stdout.replace(/mongodb\+srv:\/\/\S+/g, 'mongodb+srv://[REDACTED]') || "(Root .env empty or doesn't exist)");
      conn.end();
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
