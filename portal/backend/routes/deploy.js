import { Router } from "express";

const router = Router();

// A wrong/misshapen URL (bad path, trailing slash, wrong port) usually gets an
// HTML error page back instead of JSON — turn that into a readable message
// instead of letting res.json() throw a raw "Unexpected token '<'" error.
async function parseJsonOrExplain(upstream, targetUrl) {
  const text = await upstream.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${targetUrl} did not return JSON (HTTP ${upstream.status}) — check the URL is correct (no trailing slash, right port/path).`);
  }
}

router.get("/health/:clientId", async (req, res) => {
  const { url } = req.query;
  const targetUrl = url || `https://mcp.example.in/health`;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const data = await parseJsonOrExplain(upstream, targetUrl);
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

    const data = await parseJsonOrExplain(upstream, targetUrl);
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
