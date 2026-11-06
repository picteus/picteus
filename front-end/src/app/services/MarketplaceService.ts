import {
  Extension,
  MarketplaceApi,
  MarketplaceApiMarketplaceGetRequest,
  MarketplaceApiMarketplaceInstallRequest,
  MarketplaceExtension,
  MarketplaceExtensionDetails
} from "@picteus/ws-client";


const marketplaceApi = new MarketplaceApi();

async function list(): Promise<MarketplaceExtension[]>
{
  return marketplaceApi.marketplaceList({});
}

async function get(parameters: MarketplaceApiMarketplaceGetRequest): Promise<MarketplaceExtensionDetails>
{
  return marketplaceApi.marketplaceGet(parameters);
}

async function install(parameters: MarketplaceApiMarketplaceInstallRequest): Promise<Extension>
{
  return marketplaceApi.marketplaceInstall(parameters);
}

export default {
  list,
  get,
  install
};
