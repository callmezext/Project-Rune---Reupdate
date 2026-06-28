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
  // Find BOT_PORT and curl status
  conn.exec("grep -n 'BOT_PORT' /home/ubuntu/chloera-store/bot/server.js", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- BOT_PORT definitions ---");
      console.log(stdout);
      
      // Let's also do a curl to check the local status endpoint (usually port 5000 or similar)
      // Let's find the port first from env or default
      conn.exec("curl -s http://localhost:5000/status || curl -s http://localhost:3000/status || curl -s http://localhost:8080/status", (err2, stream2) => {
        let curlOut = "";
        stream2.on("data", (d) => { curlOut += d.toString(); });
        stream2.on("close", () => {
          console.log("--- curl status result ---");
          console.log(curlOut);
          conn.end();
        });
      });
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
