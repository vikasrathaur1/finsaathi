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

// Tells the client's MCP server to re-fetch tool registries from the Portal.
// The MCP server pulls its tools live from /api/registry/:clientId — there is
// nothing to generate or copy, just a reload after onboarding a new API.
router.post("/reload/:clientId", async (req, res) => {
  const { url, adminSecret } = req.body || {};
  const targetUrl = url || `https://mcp.example.in/admin/reload`;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(targetUrl, {
      method:  "POST",
      headers: adminSecret ? { "x-admin-secret": adminSecret } : {},
      signal:  controller.signal,
    });
    clearTimeout(timeout);

    const data = await upstream.json();
    if (!upstream.ok) return res.json({ status: "error", message: data.error || `Server returned ${upstream.status}` });
    res.json({ status: "ok", tools: data.tools });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.json({ status: "error", message: "Server did not respond within 8s" });
    }
    res.json({ status: "error", message: err.message });
  }
});

export default router;
