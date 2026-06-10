export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedDemoIfEmpty } = await import("./lib/seed-demo");
    try {
      await seedDemoIfEmpty();
    } catch (e) {
      console.error("[seed] échec du seed de démo :", e);
    }
  }
}
