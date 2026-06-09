process.env.ANALYZE = "true";
const { spawnSync } = await import("node:child_process");

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
