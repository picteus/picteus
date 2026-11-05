import { Extension, Manifest, MarketplaceApi, MarketplaceApiMarketplaceInstallRequest } from "@picteus/ws-client";


const marketplaceApi = new MarketplaceApi();

async function list(): Promise<Manifest[]>
{
  return marketplaceApi.marketplaceList({});
}

async function install(parameters: MarketplaceApiMarketplaceInstallRequest): Promise<Extension>
{
  return marketplaceApi.marketplaceInstall(parameters);
}

export default {
  list,
  install
};
