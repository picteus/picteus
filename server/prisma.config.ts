import type { PrismaConfig } from "prisma";

export default {
  migrations:
    {
      // We do not use "ts-node" and use instead a work-around taken from https://github.com/prisma/prisma/discussions/12752
      seed: "npx -p tsx@4.20.5 tsx prisma/seed.ts"
    }
} satisfies PrismaConfig;
