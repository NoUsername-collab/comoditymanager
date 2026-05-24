export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnvAtBoot } = await import("@/lib/env/server");
    assertServerEnvAtBoot();
  }
}
