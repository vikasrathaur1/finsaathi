import { Router } from "express";
import { classify } from "../lib/classifier.js";
import { registryStore } from "../lib/registryStore.js";

const router = Router();

// Proxy an NBFC API call from the browser (avoids CORS)
router.post("/proxy", async (req, res) => {
  const { url, method = "GET", headers = {}, body } = req.body;

  if (!url) return res.status(400).json({ error: "url is required" });

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 10000);

  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      signal: controller.signal,
    };
    if (method === "POST" && body) {
      options.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const upstream = await fetch(url, options);
    const text     = await upstream.text();

    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (!upstream.ok) {
      return res.status(400).json({ error: `Upstream ${upstream.status}: ${text.slice(0, 200)}` });
    }

    res.json({ response: parsed });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(408).json({ error: "Request timed out (10s)" });
    }
    res.status(500).json({ error: err.message });
  } finally {
    clearTimeout(timeout);
  }
});

// Classify raw JSON response + save registry
router.post("/classify", async (req, res) => {
  try {
    const { clientId, apiName, response, endpoint, method, headers } = req.body;

    if (!clientId || !apiName || !response) {
      return res.status(400).json({ error: "clientId, apiName and response are required" });
    }

    const { fields, summary } = classify(response);

    const registry = {
      client: { clientId },
      api:    { name: apiName, endpoint, method },
      fields,
      enumValues: {},
      thresholds: {},
      productRules: {},
      probingRules: [],
      toolGroups: [],
    };

    await registryStore.save(clientId, apiName, registry);
    res.json({ fields, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
