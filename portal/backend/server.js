import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import clientRoutes  from "./routes/client.js";
import proxyRoutes   from "./routes/proxy.js";
import excelRoutes   from "./routes/excel.js";
import analyseRoutes from "./routes/analyse.js";
import generateRoutes from "./routes/generate.js";
import registryRoutes from "./routes/registry.js";
import deployRoutes  from "./routes/deploy.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/client",        clientRoutes);
app.use("/api",               proxyRoutes);
app.use("/api",               excelRoutes);
app.use("/api",               analyseRoutes);
app.use("/api",               generateRoutes);
app.use("/api/registry",      registryRoutes);
app.use("/api/deploy",        deployRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`FinSaathi backend running on :${PORT}`));
