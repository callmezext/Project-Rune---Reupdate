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
  conn.exec("pm2 status", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- PM2 Status ---");
      console.log(stdout);
      conn.end();
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
