export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Synchronise le schéma au démarrage (crée les tables si absentes)
    if (process.env.DATABASE_URL) {
      try {
        const { execSync } = await import("child_process");
        execSync("npx prisma db push --skip-generate --accept-data-loss", {
          stdio: "inherit",
          env: process.env,
        });
      } catch (e) {
        console.error("[prisma] db push échoué :", e);
      }
    }

    const { seedDemoIfEmpty } = await import("./lib/seed-demo");
    try {
      await seedDemoIfEmpty();
    } catch (e) {
      console.error("[seed] échec du seed de démo :", e);
    }
  }
}
