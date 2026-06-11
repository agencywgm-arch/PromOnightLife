export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Le schéma est synchronisé au build (vercel.json) ou via start.sh (Docker).
    // Ici on injecte seulement les données de démo si la base est vide.
    const { seedDemoIfEmpty } = await import("./lib/seed-demo");
    try {
      await seedDemoIfEmpty();
    } catch (e) {
      console.error("[seed] échec du seed de démo :", e);
    }
  }
}
