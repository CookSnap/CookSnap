export async function track(event: string, payload?: Record<string, unknown>) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
  } catch (error) {
    console.error("Failed to track event", error);
  }
}
