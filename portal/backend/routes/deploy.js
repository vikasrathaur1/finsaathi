import { Router } from "express";

const router = Router();

router.get("/health/:clientId", async (req, res) => {
  const { url } = req.query;
  const targetUrl = url || `https://mcp.example.in/health`;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const data = await upstream.json();
    res.json({ status: data.status || "ok", tools: data.tools, client: data.client });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.json({ status: "error", message: "Server did not respond within 8s" });
    }
    res.json({ status: "error", message: err.message });
  }
});

export default router;
