import fs from "node:fs";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import AdmZip from "adm-zip";

import { paths } from "../src/paths";
import { stringify } from "../src/utils";
import { Base, Core, ExtensionBuilder } from "./base";
import { ExtensionCategory, ExtensionState, Manifest } from "../src/dtos/app.dtos";
import { ExtensionRegistry } from "../src/services/app.service";
import { ServiceError } from "../src/app.exceptions.ts";
import HttpCodes from "http-codes";


const { BAD_REQUEST } = HttpCodes;

describe("Marketplace", () =>
{

  const base = new Base(true);

  beforeAll(async () =>
  {
    await Base.beforeAll();
  });

  beforeEach(async () =>
  {
    await base.beforeEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterEach(async () =>
  {
    await base.afterEach();
  }, Core.beforeAfterTimeoutInMilliseconds);

  afterAll(async () =>
  {
    await Base.afterAll();
  });

  function writeMarketplaceExtension(base: Base, options: {
    id: string;
    name: string;
    version: string;
    category: ExtensionCategory;
    manual?: string;
  }): Manifest
  {
    const builder = new ExtensionBuilder(base, false, undefined, options.id, options.name, options.version, [ options.category ]);
    const manifest = builder.computeSimpleManifest();
    const zip = new AdmZip();
    zip.addFile(ExtensionRegistry.manifestFileName, Buffer.from(stringify(manifest), "utf8"));
    if (options.manual !== undefined)
    {
      zip.addFile(ExtensionRegistry.manualFileName, Buffer.from(options.manual, "utf8"));
    }
    fs.mkdirSync(paths.builtInExtensionsDirectoryPath, { recursive: true });
    fs.writeFileSync(path.join(paths.builtInExtensionsDirectoryPath, `${options.id}.zip`), zip.toBuffer());
    return manifest;
  }

  test("list", async () =>
  {
    const searchToken1 = "Generation";
    const searchToken2 = `Marketplace test manual`;
    const generationManifest = writeMarketplaceExtension(base, {
      id: "marketplace-generation",
      name: `${searchToken1} extension`,
      version: "1.0.0",
      category: ExtensionCategory.Generation,
      manual: `# ${searchToken1} extension\n${searchToken2}.`
    });
    const utilityManifest = writeMarketplaceExtension(base, {
      id: "marketplace-utility",
      name: "Utility extension",
      version: "1.0.0",
      category: ExtensionCategory.Other
    });
    await base.restart();

    const manifests = await base.getMarketplaceController().list(undefined, undefined);
    expect(manifests.map(manifest => manifest.id)).toEqual([ generationManifest.id, utilityManifest.id ]);
    expect((await base.getMarketplaceController().list(searchToken1.toUpperCase(), undefined)).map(manifest => manifest.id)).toEqual([ generationManifest.id ]);
    expect((await base.getMarketplaceController().list(undefined, [ ExtensionCategory.Other ])).map(manifest => manifest.id)).toEqual([ utilityManifest.id ]);
    expect((await base.getMarketplaceController().list(undefined, [ ExtensionCategory.Generation, ExtensionCategory.Other ])).map(manifest => manifest.id)).toEqual([ generationManifest.id, utilityManifest.id ]);

    const details = await base.getMarketplaceController().get(generationManifest.id);
    expect(details.manifest).toEqual(generationManifest);
    expect(details.manual?.instructions).toContain(searchToken2);

    await base.getMarketplaceController().install(generationManifest.id, ExtensionState.Paused);
    expect((await base.getMarketplaceController().list(undefined, undefined)).map(manifest => manifest.id)).toEqual([ generationManifest.id, utilityManifest.id ]);
  });

  test("install", async () =>
  {
    const manifest = writeMarketplaceExtension(base, {
      id: "id",
      name: "name",
      version: "1.0.0",
      category: ExtensionCategory.Utility
    });
    await base.restart();

    const extension = await base.getMarketplaceController().install(manifest.id, ExtensionState.Paused);
    expect(extension.state).toEqual(ExtensionState.Paused);
    expect((await base.getMarketplaceController().list(undefined, undefined)).map(manifest => manifest.id)).toEqual([ manifest.id ]);
    expect((await base.getMarketplaceController().get(manifest.id)).manifest).toEqual(manifest);
    await expect(base.getMarketplaceController().install(manifest.id, ExtensionState.Enabled)).rejects.toThrow(new ServiceError("An extension with the same id 'id' is already installed", BAD_REQUEST, base.badParameterCode));
  });

  test("update", async () =>
  {
    const baseOptions =
      {
        id: "marketplace-update",
        name: "Update extension",
        category: ExtensionCategory.Other
      };
    const initialVersion = "1.0.0";
    writeMarketplaceExtension(base, { ...baseOptions, version: initialVersion });
    await base.restart();

    const extension = await base.getMarketplaceController().install(baseOptions.id, ExtensionState.Enabled);
    expect(extension.manifest.version).toEqual(initialVersion);
    expect(extension.state).toEqual(ExtensionState.Enabled);
    await expect(base.getMarketplaceController().update(baseOptions.id, ExtensionState.Paused)).rejects.toThrow(new ServiceError(`The extension marketplace version '${initialVersion}' is not greater than the installed version '${initialVersion}'`, BAD_REQUEST, base.badParameterCode));

    const updatedVersion = "1.0.1";
    writeMarketplaceExtension(base, { ...baseOptions, version: updatedVersion });
    await base.restart();
    const updatedExtension = await base.getMarketplaceController().update(baseOptions.id, ExtensionState.Paused);
    expect(updatedExtension.manifest.version).toEqual(updatedVersion);
    expect(updatedExtension.state).toEqual(ExtensionState.Paused);
  });

});
