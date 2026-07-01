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
    const gitCheck = await execCommand("git --version");
    console.log("Git Version:", gitCheck.stdout.trim());

    // Check if we can pull or clone
    console.log("Checking if github SSH keys or credentials work...");
    const cloneTest = await execCommand("git ls-remote https://github.com/callmezext/Project-Rune---Reupdate.git");
    console.log("ls-remote stdout:", cloneTest.stdout);
    console.log("ls-remote stderr:", cloneTest.stderr);
    console.log("Exit Code:", cloneTest.code);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    conn.end();
  }
}).on("error", (err) => {
  console.error("SSH error:", err);
}).connect(config);
