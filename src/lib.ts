
/**
 * The **bulk function** receives and array of atomic inputs and returns and array of outputs processed in bulk mode.
 * It is essential that this function works more effeciently with an array of items than doing the same operation individually.
 * The response of this function is an array where the items must be placed in the same position than the input items.
 * ```typescript
 * //bulk operation
 * mongodb.insertMany([obj1, obj2, obj3])
 * //atomic operation
 * Promise.all([
 *  mongodb.insertOne(obj1),
 *  mongodb.insertOne(obj2),
 *  mongodb.insertOne(obj3)
 * ])
 * ```
 * 
 * @typeParam Input The input item type.
 * @typeParam Output The output response type.
 */
export type ExecuteBulkFn<Input,Output> = (items: Input[]) => Promise<Output[]>

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

/**
 * This is the main `promise-bulk` feature.
 * This class allows to instantiate bulk processes.
 * 
 * A bulk function is the only required constructor parameter.
 * 
 * @typeParam Input The type of the input items to be processed by the bulk function.
 * 
 * @typeParam Output The type of the response items of the bulk function.
 */
export class PromiseBulk<Input = unknown, Output = unknown> {
    private _index = 0
    private readonly _bulks: PromiseBulkSingle<Input,Output>[]

    /**
     * 
     * @param bulkFn Bulk function. Receives an array of imputs and returns an array of outputs.
     * @param _concurrency Limit of concurrent calls to the bulk function.
     */
    constructor(bulkFn: ExecuteBulkFn<Input,Output>, private readonly _concurrency = 1) {
        this._index = 0
        this._bulks = Array.from({length: _concurrency}, () => new PromiseBulkSingle(bulkFn))
    }

    /**
     * Execute
     * 
     * This function adds one item to the bulk process and waits for its response in a bulk operation.
     * @param item Atomic input that will be included in a bulk process
     * @returns The associated response to the input (will be returned from a bulk process)
     */
    async execute(item: Input) {
        const index = this._index
        this._index = (this._index+1) % this._concurrency
        return this._bulks[index].execute(item)
    }
}