import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from ".prisma/client";


const prisma = new PrismaClient();

async function main()
{
  const herebyDirectoryPath = dirname(fileURLToPath(import.meta.url));
  const directoryNames = fs.readdirSync(path.join(herebyDirectoryPath, "migrations")).filter((directoryName: string) =>
  {
    return directoryName !== "migration_lock.toml";
  }).sort();

  const migrationType = "migration";
  const migration = directoryNames[directoryNames.length - 1];
  console.info(`Remembers the database migration '${migration}'`);
  const where = { type: migrationType };
  if (prisma.settings.findUnique({ where }) !== null)
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
