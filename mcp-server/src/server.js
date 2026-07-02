import express       from "express";
import cors          from "cors";
import dotenv        from "dotenv";
import path          from "path";
import { fileURLToPath } from "url";
import { createHash }    from "crypto";
import { v4 as uuidv4 }  from "uuid";
import { Server }        from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { SSEServerTransport }          from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadTools, getTools, reloadTools } from "./tools/loader.js";
import { dispatch }    from "./tools/dispatcher.js";
import { sendOtp, verifyOtp, issueToken } from "./auth/session.js";
import { validateToken } from "./auth/session.js";

dotenv.config();

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const PORT        = parseInt(process.env.PORT || "3001");
const CLIENT_ID   = process.env.CLIENT_ID || "finsaathi";
const SANDBOX_OTP = process.env.SANDBOX_OTP || "123456";

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", true); // so req.protocol = "https" behind ngrok
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // OAuth /token is form-encoded
app.use(express.static(path.join(__dirname, "../public")));

// PKCE-S256 verifier: SHA256(verifier) base64url == challenge
function verifyPkce(verifier, challenge, method = "S256") {
  if (!verifier || !challenge) return true;
  if (method === "plain") return verifier === challenge;
  const digest = createHash("sha256").update(verifier).digest("base64url");
  return digest === challenge;
}

// ── Health endpoint ──────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  const tools = getTools();
  res.json({
    status:   "ok",
    client:   CLIENT_ID,
    tools:    tools.length,
    toolList: tools.map((t) => t.name),
    uptime:   Math.floor(process.uptime()),
  });
});

// ── OAuth Protected Resource metadata (RFC 9728 — required for Claude.ai) ────
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    resource:                 base,
    authorization_servers:    [base],
    scopes_supported:         ["loan"],
    bearer_methods_supported: ["header"],
  });
});

// ── OAuth 2.1 authorization server metadata ───────────────────────────────────
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    issuer:                              base,
    authorization_endpoint:              `${base}/authorize`,
    token_endpoint:                      `${base}/token`,
    registration_endpoint:               `${base}/register`,
    response_types_supported:            ["code"],
    grant_types_supported:               ["authorization_code"],
    code_challenge_methods_supported:    ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// ── Dynamic Client Registration (RFC 7591 — required for Claude.ai) ──────────
const registeredClients = new Map();

app.post("/register", (req, res) => {
  const {
    redirect_uris, client_name, grant_types,
    response_types, token_endpoint_auth_method, scope,
  } = req.body;

  if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return res.status(400).json({
      error: "invalid_client_metadata",
      error_description: "redirect_uris is required",
    });
  }

  const client_id           = `finsaathi-${uuidv4()}`;
  const client_id_issued_at = Math.floor(Date.now() / 1000);

  const client = {
    client_id,
    client_id_issued_at,
    redirect_uris,
    client_name:                client_name || "Claude",
    grant_types:                grant_types || ["authorization_code"],
    response_types:             response_types || ["code"],
    token_endpoint_auth_method: token_endpoint_auth_method || "none",
    scope:                      scope || "loan",
  };
  registeredClients.set(client_id, client);

  res.status(201).json(client);
});

// Authorization code store (in-memory, short-lived)
const authCodes = new Map();

// ── Auth page ─────────────────────────────────────────────────────────────────
app.get("/authorize", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/authorize.html"));
});

// ── OTP flow (called by the auth page JS) ─────────────────────────────────────
app.post("/auth/send-otp", async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Valid 10-digit mobile required" });
  }
  const result = await sendOtp(mobile);
  res.json({ sent: true, sandbox: result.sandbox, sandboxOtp: result.sandbox ? SANDBOX_OTP : undefined });
});

app.post("/auth/verify-otp", async (req, res) => {
  const { mobile, otp, redirect_uri, state, code_challenge, code_challenge_method } = req.body;
  const result = verifyOtp(mobile, otp);
  if (!result.valid) return res.status(401).json({ error: result.reason });

  const code = uuidv4();
  authCodes.set(code, {
    mobile,
    expiresAt:             Date.now() + 60000, // 60s to exchange
    code_challenge,
    code_challenge_method: code_challenge_method || "S256",
  });
  res.json({ code, state });
});

// ── Token endpoint (OAuth code exchange) ────────────────────────────────────
app.post("/token", (req, res) => {
  const { code, grant_type, code_verifier } = req.body;
  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  const record = authCodes.get(code);
  if (!record || Date.now() > record.expiresAt) {
    authCodes.delete(code);
    return res.status(401).json({ error: "invalid_grant" });
  }

  // PKCE verification
  if (record.code_challenge && !verifyPkce(code_verifier, record.code_challenge, record.code_challenge_method)) {
    authCodes.delete(code);
    return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
  }

  authCodes.delete(code);
  const token  = issueToken(record.mobile);
  const ttlMin = parseInt(process.env.SESSION_TTL_MINUTES || "30");
  res.json({
    access_token: token,
    token_type:   "Bearer",
    expires_in:   ttlMin * 60,
    scope:        "loan",
  });
});

// ── Reload tools endpoint (call after Portal update) ────────────────────────
app.post("/admin/reload", async (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== process.env.ADMIN_SECRET && process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const tools = await reloadTools();
  res.json({ reloaded: true, tools: tools.length });
});

// ── MCP tool registration helper ─────────────────────────────────────────────
// Uses the low-level Server class so tool inputSchemas are passed as plain
// JSON Schema objects — McpServer requires Zod schemas which we don't use.
function createMcpServer() {
  const tools = getTools();
  const server = new Server(
    { name: `finsaathi-${CLIENT_ID}`, version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name:        t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    return await dispatch(name, args ?? {});
  });

  return server;
}

// ── Auth helper ───────────────────────────────────────────────────────────────
function checkAuth(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (!token) {
    res.setHeader("WWW-Authenticate", `Bearer realm="finsaathi"`);
    res.status(401).json({ error: "Authorization required" });
    return false;
  }
  const session = validateToken(token);
  if (!session.valid) {
    res.setHeader("WWW-Authenticate", `Bearer realm="finsaathi", error="invalid_token"`);
    res.status(401).json({ error: "Invalid or expired token" });
    return false;
  }
  return true;
}

// ── SSE transport (legacy GET-based clients) ──────────────────────────────────
const sseTransports = new Map();

app.get("/sse", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const transport = new SSEServerTransport("/messages", res);
  sseTransports.set(transport.sessionId, transport);
  res.on("close", () => sseTransports.delete(transport.sessionId));

  await createMcpServer().connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = sseTransports.get(sessionId);
  if (!transport) return res.status(404).json({ error: "Session not found" });
  await transport.handlePostMessage(req, res);
});

// ── Streamable HTTP transport (Claude.ai and newer clients) ──────────────────
// Sessions must be persisted between requests — a new transport per request
// would give every request a different sessionId, causing 400/404 on follow-up calls.
const httpTransports = new Map();

async function handleStreamableHTTP(req, res) {
  if (!checkAuth(req, res)) return;

  const sessionId = req.headers["mcp-session-id"];

  if (sessionId) {
    const existing = httpTransports.get(sessionId);
    if (!existing) return res.status(404).json({ error: "Session not found or expired" });
    await existing.handleRequest(req, res, req.body);
    return;
  }

  // No session yet — only POST (initialize) is valid here
  if (req.method !== "POST") {
    return res.status(400).json({ error: "mcp-session-id header required for " + req.method });
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: uuidv4,
    // sessionId is assigned inside handleRequest (during initialize), not at construction.
    // onsessioninitialized fires at that exact moment so we can store it before responding.
    onsessioninitialized: (sid) => { httpTransports.set(sid, transport); },
  });
  transport.onclose = () => {
    if (transport.sessionId) httpTransports.delete(transport.sessionId);
  };

  await createMcpServer().connect(transport);
  await transport.handleRequest(req, res, req.body);
}

// /sse POST — Claude.ai may POST to the configured SSE URL using StreamableHTTP
app.post("/sse", handleStreamableHTTP);

// /mcp — primary StreamableHTTP endpoint
app.post("/mcp",   handleStreamableHTTP);
app.get("/mcp",    handleStreamableHTTP);
app.delete("/mcp", handleStreamableHTTP);

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await loadTools();
  app.listen(PORT, () => {
    console.log(`\nFinSaathi MCP Server`);
    console.log(`  Client:  ${CLIENT_ID}`);
    console.log(`  Port:    ${PORT}`);
    console.log(`  SSE:     http://localhost:${PORT}/sse`);
    console.log(`  HTTP:    http://localhost:${PORT}/mcp`);
    console.log(`  Health:  http://localhost:${PORT}/health`);
    console.log(`  Auth:    http://localhost:${PORT}/authorize\n`);
  });
}

start().catch((err) => { console.error("Startup failed:", err); process.exit(1); });
