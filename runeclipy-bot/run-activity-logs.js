const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const conn = new Client();

const config = {
  host: "157.66.55.188",
  port: 18174,
  username: "ubuntu",
  password: "zett@VPS"
};

const localScript = path.join(__dirname, "read-activity-logs.js");
const remoteScript = "/home/ubuntu/rune-dc/read-activity-logs.js";

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
    // Upload check script
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(localScript, remoteScript, {}, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    // Run read-activity-logs.js on VPS
    const runRes = await execCommand("cd /home/ubuntu/rune-dc && node read-activity-logs.js");
    console.log("--- Activity Logs Results ---");
    console.log(runRes.stdout);
    if (runRes.stderr) console.error("Stderr:", runRes.stderr);

  } catch (err) {
    console.error("Error running activity logs check:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
