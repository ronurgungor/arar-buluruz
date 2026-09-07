import fs from "node:fs";
import path from "node:path";

const handoffDir = process.env.PHASE2_HANDOFF_DIR ?? path.resolve("test-results/phase2-handoff");
fs.rmSync(handoffDir, { recursive: true, force: true });
fs.mkdirSync(handoffDir, { recursive: true, mode: 0o700 });

const phases = [
  "scripts/stage1-self-service-browser-e2e-seller-create.ts",
  "scripts/stage1-self-service-browser-e2e-buyer.ts",
  "scripts/stage1-self-service-browser-e2e-seller-management.ts",
] as const;

for (const script of phases) {
  const env = { ...process.env, PHASE2_HANDOFF_DIR: handoffDir };
  if (script.endsWith("-buyer.ts")) delete env.BACKEND_SERVICE_ROLE_KEY;
  const processHandle = Bun.spawn([process.execPath, script], {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await processHandle.exited;
  if (exitCode !== 0) throw new Error(`${script} failed with exit code ${exitCode}.`);
}

fs.rmSync(handoffDir, { recursive: true, force: true });
console.log("Stage 1 + Product Finding Phase 2 split-process browser acceptance passed.");
