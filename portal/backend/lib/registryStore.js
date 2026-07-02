import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE      = path.resolve(process.env.REGISTRY_PATH || path.join(__dirname, "../registry"));

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function clientDir(clientId) {
  return path.join(BASE, clientId);
}

function registryPath(clientId, apiName) {
  return path.join(clientDir(clientId), `${apiName}-registry.json`);
}

function clientConfigPath(clientId) {
  return path.join(clientDir(clientId), "client-config.json");
}

export const registryStore = {
  async saveClientConfig(clientId, config) {
    await ensureDir(clientDir(clientId));
    await fs.writeFile(clientConfigPath(clientId), JSON.stringify(config, null, 2));
  },

  async loadClientConfig(clientId) {
    try {
      const raw = await fs.readFile(clientConfigPath(clientId), "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async save(clientId, apiName, registry) {
    await ensureDir(clientDir(clientId));
    await fs.writeFile(registryPath(clientId, apiName), JSON.stringify(registry, null, 2));
  },

  async load(clientId, apiName) {
    try {
      const raw = await fs.readFile(registryPath(clientId, apiName), "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  // Returns all API registries for a client that have approved toolGroups
  async loadAll(clientId) {
    try {
      const dir   = clientDir(clientId);
      const files = await fs.readdir(dir);
      const registries = [];
      for (const file of files) {
        if (!file.endsWith("-registry.json")) continue;
        try {
          const raw      = await fs.readFile(path.join(dir, file), "utf-8");
          const registry = JSON.parse(raw);
          registries.push(registry);
        } catch { /* skip corrupt files */ }
      }
      return registries;
    } catch {
      return [];
    }
  },
};
