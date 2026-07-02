import { Router } from "express";
import { registryStore } from "../lib/registryStore.js";

const router = Router();

// List all APIs + tool counts for a client — used by MCP server at startup
router.get("/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const registries   = await registryStore.loadAll(clientId);
    const summary = registries.map((r) => ({
      apiName:    r.api?.name,
      toolCount:  (r.toolGroups || []).length,
      tools:      (r.toolGroups || []).map((g) => g.name),
    }));
    res.json({ clientId, apis: summary, total: registries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:clientId/:apiName", async (req, res) => {
  try {
    const { clientId, apiName } = req.params;
    const registry = await registryStore.load(clientId, apiName);
    if (!registry) return res.status(404).json({ error: "Registry not found" });
    res.json(registry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:clientId/:apiName", async (req, res) => {
  try {
    const { clientId, apiName } = req.params;
    await registryStore.save(clientId, apiName, req.body);
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
