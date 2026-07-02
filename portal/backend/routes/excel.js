import { Router } from "express";
import multer from "multer";
import { buildExcel } from "../lib/excelBuilder.js";
import { parseExcel } from "../lib/excelParser.js";
import { registryStore } from "../lib/registryStore.js";

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/generate-excel", async (req, res) => {
  try {
    const { clientId, apiName } = req.body;
    const registry = await registryStore.load(clientId, apiName);
    if (!registry) return res.status(404).json({ error: "Registry not found" });

    const buffer = buildExcel(registry);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${clientId}-${apiName}-registry.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/parse-excel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { clientId, apiName } = req.body;

    const parsed = parseExcel(req.file.buffer);

    // Merge parsed data with existing registry
    if (clientId && apiName) {
      const existing = await registryStore.load(clientId, apiName) || {};
      const merged = {
        ...existing,
        fields:       parsed.fields       || existing.fields,
        enumValues:   parsed.enumValues   || existing.enumValues,
        thresholds:   parsed.thresholds   || existing.thresholds,
        productRules: parsed.productRules || existing.productRules,
        probingRules: parsed.probingRules || existing.probingRules,
      };
      await registryStore.save(clientId, apiName, merged);
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
