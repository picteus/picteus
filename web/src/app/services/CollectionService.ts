import { Collection, CollectionApi, SearchFilter } from "@picteus/ws-client";

const collectionApi = new CollectionApi();

class CollectionService {

    async listAll(): Promise<Collection[]> {
        return collectionApi.collectionList();
    }

    async create(
        name: string,
        searchFilter: SearchFilter,
        comment?: string,
    ): Promise<Collection> {
        return collectionApi.collectionCreate({
            name,
            searchFilter,
            comment: comment === "" ? undefined : comment
        });
    }

    async update(
        id: number,
        name?: string,
        searchFilter?: SearchFilter,
        comment?: string,
    ): Promise<Collection> {
        return collectionApi.collectionUpdate({
            id,
            name,
            searchFilter,
            comment: comment === "" ? undefined : comment
        });
    }

    async delete(id: number): Promise<void> {
        return collectionApi.collectionDelete({
            id,
        });
    }

    async get(id: number): Promise<Collection> {
        return collectionApi.collectionGet({
            id,
        });
    }
}

export default new CollectionService();
