import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const workspaces = ["@repoguide/web", "@repoguide/api"];

function startWorkspace(workspace) {
  const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args = isWindows
    ? ["/d", "/s", "/c", `npm run dev --workspace ${workspace}`]
    : ["run", "dev", "--workspace", workspace];

  return spawn(command, args, { stdio: "inherit" });
}

const children = workspaces.map(startWorkspace);

let shuttingDown = false;

function stopChildren(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

if (!isWindows) {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      stopChildren(signal);
    });
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown) {
      process.exitCode = code ?? 1;
      stopChildren();
    }
  });
}
