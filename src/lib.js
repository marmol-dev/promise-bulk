
class PromiseBulkSingle {
    constructor(executeBulk = null) {
        this._executionItemsPromise = Promise.resolve()
        this._pendingItems = []
        this._free = true
        this._executeBulk = executeBulk
    }

    async execute(item) {
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

module.exports.PromiseBulk = class PromiseBulk {
    constructor(executeBulk = null, concurrency = 1) {
        this._index = 0
        this._concurrency = concurrency
        this._bulks = Array.from({length: concurrency}, () => new PromiseBulkSingle(executeBulk))
    }

    async execute(item) {
        const index = this._index
        this._index = (this._index+1) % this._concurrency
        return this._bulks[index].execute(item)
    }
}