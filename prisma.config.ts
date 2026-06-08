// KOMPASSI - Prisma Configuration
// Replaces the deprecated "prisma" field in package.json.

import { defineConfig } from "prisma/config";

export default defineConfig({
  seed: {
    command: "npx tsx prisma/seed.ts",
  },
});
