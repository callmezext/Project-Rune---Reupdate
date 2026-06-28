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
  conn.exec("grep -n -C 15 -i -E 'client.on\\(\"message\"|client.on\\(\\'message\\'' /home/ubuntu/chloera-store/bot/server.js", (err, stream) => {
    if (err) { conn.end(); return; }
    let stdout = "";
    stream.on("data", (d) => { stdout += d.toString(); });
    stream.on("close", () => {
      console.log("--- WhatsApp Message Event Handler ---");
      console.log(stdout || "(No direct match, let's search for client.on)");
      if (!stdout) {
        conn.exec("grep -n -C 5 -i 'client.on' /home/ubuntu/chloera-store/bot/server.js", (err2, stream2) => {
          let stdout2 = "";
          stream2.on("data", (d) => { stdout2 += d.toString(); });
          stream2.on("close", () => {
            console.log("--- client.on occurrences ---");
            console.log(stdout2);
            conn.end();
          });
        });
      } else {
        conn.end();
      }
    });
  });
}).on("error", (err) => {
  console.error("🔴 SSH connection error:", err);
}).connect(config);
