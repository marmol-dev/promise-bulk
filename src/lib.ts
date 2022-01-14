
export type ExecuteBulkFn<I,O> = (items: I[]) => Promise<O[]>

class PromiseBulkSingle<I,O> {
    private _executionItemsPromise: Promise<O[]> = Promise.resolve([])
    private _pendingItems = []
    private _free = true


    constructor(private readonly _executeBulk: ExecuteBulkFn<I,O>) {}

    async execute(item: I) {
        const newSize = this._pendingItems.push(item)
        const myIndex = newSize - 1

        if (this._free) {
            this._free = false
            const itemsToExecute = this._pendingItems
            this._pendingItems = []
            this._executionItemsPromise = this.executeBulk(itemsToExecute)
    
            const executedItems = await this._executionItemsPromise
            this._free = true
    
            return executedItems[myIndex]
    
        } else {
            await this._executionItemsPromise
    
            if (this._free) {
                this._free = false
                const itemsToExecute = this._pendingItems
                this._pendingItems = []
                this._executionItemsPromise = this.executeBulk(itemsToExecute)
    
                const executionItems = await this._executionItemsPromise
                this._free = true
                return executionItems[myIndex]
            } else {
                const executedItems = await this._executionItemsPromise
                return executedItems[myIndex]
            }
        }
    }

    executeBulk(items) {
        if (!this._executeBulk) {
            throw new Error('Execute bulk not implemented')
        }
        return this._executeBulk(items)
    }



}

export class PromiseBulk<I = unknown, O = unknown> {
    private _index = 0
    private readonly _bulks: PromiseBulkSingle<I,O>[]

    constructor(executeBulk: ExecuteBulkFn<I,O>, private readonly _concurrency = 1) {
        this._index = 0
        this._bulks = Array.from({length: _concurrency}, () => new PromiseBulkSingle(executeBulk))
    }

    async execute(item: I) {
        const index = this._index
        this._index = (this._index+1) % this._concurrency
        return this._bulks[index].execute(item)
    }
}