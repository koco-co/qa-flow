import { spawn, type ChildProcess } from "child_process";
import { resolve } from "path";

const TAURI_DRIVER_BIN = "tauri-driver";
const APP_BINARY = resolve(__dirname, "../../../src-tauri/target/debug/kata-workbench");
const E2E_DIR = resolve(__dirname, "..");

export interface TauriAppFixture {
  app: ChildProcess;
  driver: ChildProcess;
  env: NodeJS.ProcessEnv;
}

export async function startTauriApp(options?: {
  claudeBin?: string;
  root?: string;
  dataDir?: string;
}): Promise<TauriAppFixture> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    KATA_CLAUDE_BIN: options?.claudeBin ?? `${E2E_DIR}/fixtures/mock-claude.sh`,
    KATA_ROOT: options?.root ?? `${E2E_DIR}/fixtures/test-projects/demo-project`,
    KATA_DATA_DIR: options?.dataDir ?? `${E2E_DIR}/results/temp-${Date.now()}`,
    NO_COLOR: "1",
  };

  const app = spawn(APP_BINARY, [], { env, stdio: ["ignore", "pipe", "pipe"] });
  const driver = spawn(TAURI_DRIVER_BIN, [], { stdio: ["ignore", "pipe", "pipe"] });

  // Wait for WebDriver session to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("tauri-driver startup timeout")), 15000);
    driver.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (text.includes("WebDriver")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    driver.stderr?.on("data", (_data: Buffer) => {
      // tauri-driver may log to stderr; not necessarily an error
    });
  });

  return { app, driver, env };
}

export async function stopTauriApp(fixture: TauriAppFixture): Promise<void> {
  fixture.driver.kill("SIGTERM");
  fixture.app.kill("SIGTERM");

  // Wait for processes to exit
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Force kill if still alive
  try { fixture.driver.kill("SIGKILL"); } catch {}
  try { fixture.app.kill("SIGKILL"); } catch {}
}
