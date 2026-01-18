import { ExtensionsService, RepositoriesService } from "app/services";

async function initialize() {
  await RepositoriesService.fetchAll();
  await ExtensionsService.fetchAll();
}

export default {
  initialize,
};
