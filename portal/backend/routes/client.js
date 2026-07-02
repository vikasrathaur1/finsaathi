import { Router } from "express";
import { registryStore } from "../lib/registryStore.js";

const router = Router();

router.post("/setup", async (req, res) => {
  try {
    const {
      name, clientId, domain, primaryColour,
      channels, authMethod, oauthDomain, tokenTtl,
      smsProvider, templateId, sandboxOtp,
    } = req.body;

    if (!name || !clientId || !domain) {
      return res.status(400).json({ error: "name, clientId and domain are required" });
    }

    const config = {
      clientId,
      name,
      domain,
      channels: channels || ["claude"],
      auth: {
        method: authMethod || "otp",
        sandboxOtp: sandboxOtp || "123456",
        ...(authMethod === "oauth"
          ? { oauthDomain, tokenTtl: Number(tokenTtl) || 3600 }
          : { smsProvider, templateId }),
      },
      branding: {
        primaryColour: primaryColour || "#6366f1",
      },
      createdAt: new Date().toISOString(),
    };

    await registryStore.saveClientConfig(clientId, config);
    res.json({ config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
