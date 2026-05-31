/**
 * Custom environment loader — CommonJS compatible.
 * Prioritizes system environment variables over .env file values.
 * Works in both Expo Metro (ESM) and EAS CLI (CJS) contexts.
 */
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  lines.forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      // System env vars take priority — never overwrite
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}
