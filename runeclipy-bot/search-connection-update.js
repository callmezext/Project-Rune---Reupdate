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
  conn.exec("grep -n -C 35 'connection.update' /home/ubuntu/chloera-store/bot/server.js", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- connection.update Handler ---");
      console.log(stdout || "(No match found)");
      conn.end();
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
