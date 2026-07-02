import { Router } from "express";
import { claudeClient } from "../lib/claude.js";

const router = Router();

router.post("/analyse", async (req, res) => {
  try {
    const { registry, note } = req.body;
    if (!registry) return res.status(400).json({ error: "registry is required" });

    const system = `You are a tool architect for financial services MCP servers.
Given the field registry below, propose how to group fields into MCP tools.

Rules:
- One distinct customer question → one tool
- Fields always needed together → one tool
- Max 6-7 tools per API — no over-fragmentation
- Name each tool as the customer question it answers (get_loan_summary, get_emi_details etc.)
- Note which prodCategories each tool applies to
- Note notApplicable cases with reason (e.g. "GOLD LOAN: Bullet repayment — no EMI schedule")
- Return ONLY reasoning and grouping proposal. No code.

Return ONLY valid JSON with this structure:
{
  "toolGroups": [
    {
      "name": "get_loan_summary",
      "answers": "What loan do I have?",
      "fields": ["agreementNo", "prodDesc", "relStatus"],
      "applicableProducts": "all",
      "notApplicable": {}
    }
  ],
  "reasoning": "Explanation of grouping decisions"
}`;

    const userMessage = `Field Registry:
${JSON.stringify(registry, null, 2)}
${note ? `\n\nAdditional instruction: ${note}` : ""}`;

    const response = await claudeClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned non-JSON response");

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
