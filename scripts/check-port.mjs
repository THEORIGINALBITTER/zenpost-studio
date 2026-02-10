import net from "node:net";
import { execFileSync } from "node:child_process";

const PORT = 1420;
const HOST = "127.0.0.1";

const server = net.createServer();

server.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    try {
      const output = execFileSync(
        "lsof",
        ["-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN", "-t"],
        { encoding: "utf8" }
      ).trim();

      const pids = output
        .split("\n")
        .map((pid) => pid.trim())
        .filter(Boolean);

      if (pids.length === 0) {
        console.error(
          `[dev-check] Port ${PORT} is already in use on ${HOST}. No PID found.`
        );
        process.exit(1);
      }

      for (const pid of pids) {
        let commandLine = "";
        try {
          commandLine = execFileSync(
            "ps",
            ["-p", String(pid), "-o", "command="],
            { encoding: "utf8" }
          ).trim();
        } catch (psErr) {
          console.error(
            `[dev-check] Failed to read command line for PID ${pid}:`,
            psErr
          );
          process.exit(1);
        }

        const isSafeToKill =
          commandLine.includes("vite") ||
          commandLine.includes("tauri") ||
          commandLine.includes("npm run dev") ||
          commandLine.includes("npm run tauri");

        if (!isSafeToKill) {
          console.error(
            `[dev-check] Port ${PORT} is in use by a non-dev process (PID ${pid}).`
          );
          console.error(`[dev-check] Command: ${commandLine}`);
          console.error(
            "[dev-check] Refusing to kill. Stop it manually or change the port."
          );
          process.exit(1);
        }

        try {
          process.kill(Number(pid), "SIGTERM");
          console.log(`[dev-check] Killed process ${pid} on port ${PORT}.`);
        } catch (killErr) {
          console.error(
            `[dev-check] Failed to kill process ${pid} on port ${PORT}:`,
            killErr
          );
          process.exit(1);
        }
      }

      // Give the OS a brief moment to release the port
      setTimeout(() => process.exit(0), 200);
      return;
    } catch (listErr) {
      console.error(
        `[dev-check] Port ${PORT} is already in use, but failed to list PIDs:`,
        listErr
      );
      process.exit(1);
    }
  }

  console.error(`[dev-check] Failed to check port ${PORT}:`, err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  server.close(() => process.exit(0));
});
