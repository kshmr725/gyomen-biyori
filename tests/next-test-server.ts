import { spawn } from "node:child_process";
import { join } from "node:path";

export type NextTestServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

export async function startNextTestServer(options: {
  supabaseUrl: string;
  anonKey: string;
  port?: number;
}): Promise<NextTestServer> {
  const port = options.port ?? 3137;
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const processLogs: string[] = [];
  const server = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: options.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: options.anonKey,
      SUPABASE_URL: options.supabaseUrl,
      SUPABASE_ANON_KEY: options.anonKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const collectLog = (chunk: Buffer) => {
    processLogs.push(chunk.toString());
    if (processLogs.length > 80) processLogs.shift();
  };
  server.stdout.on("data", collectLog);
  server.stderr.on("data", collectLog);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next test server exited early:\n${processLogs.join("")}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.status > 0) break;
    } catch {
      // The development server is still compiling.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempt === 119) {
      server.kill("SIGTERM");
      throw new Error(`Next test server did not become ready:\n${processLogs.join("")}`);
    }
  }

  return {
    baseUrl,
    stop: async () => {
      if (server.exitCode !== null) return;
      server.kill("SIGTERM");
      await Promise.race([
        new Promise<void>((resolve) => server.once("exit", () => resolve())),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            if (server.exitCode === null) server.kill("SIGKILL");
            resolve();
          }, 5_000),
        ),
      ]);
    },
  };
}
