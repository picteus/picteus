import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from ".prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";


const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl)
{
  console.error("Cannot seed the database because the DATABASE_URL environment variable is not defined");
  process.exit(1);
}
const herebyDirectoryPath = dirname(fileURLToPath(import.meta.url));
// We resolve a relative database URL against the back-end directory — the directory of the "prisma.config.ts" file, like the Prisma CLI does —, so that the seed does not depend on the current working directory
const databaseFilePath = path.resolve(herebyDirectoryPath, "..", databaseUrl.replace(/^file:/, ""));
const adapter = new PrismaBetterSqlite3({ url: `file:${databaseFilePath}` });
const prisma = new PrismaClient({ adapter });

async function main()
{
  const directoryNames = fs.readdirSync(path.join(herebyDirectoryPath, "migrations")).filter((directoryName: string) =>
  {
    return directoryName !== "migration_lock.toml";
  }).sort();

  const migrationType = "migration";
  const migration = directoryNames[directoryNames.length - 1];
  console.info(`Remembers the database migration '${migration}'`);
  const where = { type: migrationType };
  if ((await prisma.settings.findUnique({ where })) !== null)
  {
    await prisma.settings.update({ data: { value: migration }, where: where });
  }
  else
  {
    await prisma.settings.create({ data: { type: migrationType, value: migration } });
  }
}

main().catch(async (error) =>
{
  console.error("Could not seed properly the database", error);
  process.exit(1);
}).finally(async () =>
{
  await prisma.$disconnect();
});
