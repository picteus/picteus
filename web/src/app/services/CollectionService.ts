import { Collection, CollectionApi, SearchFilter } from "@picteus/ws-client";


const collectionApi = new CollectionApi();

class CollectionService {

    private collections?: Collection[];

    async listAll(): Promise<Collection[]> {
        if (this.collections === undefined) {
            await this.refresh();
        }
        return this.collections;
    }

    async create(
        name: string,
        searchFilter: SearchFilter,
        comment?: string,
    ): Promise<Collection> {
        const result = await collectionApi.collectionCreate({
            name,
            searchFilter,
            comment: comment === "" ? undefined : comment
        });
        await this.refresh();
        return result;
    }

    async update(
        id: number,
        name?: string,
        searchFilter?: SearchFilter,
        comment?: string,
    ): Promise<Collection> {
        const result = await collectionApi.collectionUpdate({
            id,
            name,
            searchFilter,
            comment: comment === "" ? undefined : comment
        });
        await this.refresh();
        return result;
    }

    async delete(id: number): Promise<void> {
        const result =  await collectionApi.collectionDelete({ id });
        await this.refresh();
        return result;
    }

    async get(id: number): Promise<Collection> {
        return collectionApi.collectionGet({ id });
    }

    private async refresh()
    {
        this.collections = await collectionApi.collectionList();
    }

}

export default new CollectionService();
