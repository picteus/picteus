import { Collection, CollectionApi, SearchFilter } from "@picteus/ws-client";


const collectionApi = new CollectionApi();

async function fetchAll(): Promise<Collection[]>
{
  return await collectionApi.collectionList();
}

async function get(id: number): Promise<Collection>
{
  return collectionApi.collectionGet({ id });
}

async function create(name: string, searchFilter: SearchFilter, comment?: string): Promise<Collection>
{
  return collectionApi.collectionCreate({
    name,
    searchFilter,
    comment: comment === "" ? undefined : comment
  });
}

async function update(id: number, name?: string, searchFilter?: SearchFilter, comment?: string): Promise<Collection>
{
  return collectionApi.collectionUpdate({
    id,
    name,
    searchFilter,
    comment: comment === "" ? undefined : comment
  });
}

async function deleteCollection(id: number): Promise<void>
{
  await collectionApi.collectionDelete({ id });
}

export default {
  fetchAll,
  get,
  create,
  update,
  delete: deleteCollection
};
