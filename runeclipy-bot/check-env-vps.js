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
  conn.exec("cat /home/ubuntu/rune-dc/.env", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- .env on VPS ---");
      // Mask values for security but show variable names and lengths
      const lines = stdout.split("\n");
      lines.forEach(line => {
        const parts = line.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim();
          console.log(`${key}: length ${val.length}, starts with ${val.substring(0, 5)}...`);
        } else {
          console.log(line);
        }
      });
      conn.end();
    });
  });
}).on("error", (err) => {
  console.error("SSH connection error:", err);
}).connect(config);
