const mongodb = require('mongodb')
const mapLimit = require('promise-map-limit')
const {PromiseBulk} = require('../src')

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost/bulk_node'
const ITEMS_COUNT = Number(process.env.ITEMS_COUNT ?? 10 * 1000)
const ITEMS_SIZE = Number(process.env.ITEMS_SIZE ?? 5)
const ITEMS_PROPERTIES_SIZE = Number(process.env.ITEMS_PROPERTIES_SIZE ?? 30)
const INSERT_CONCURRENCY = Number(process.env.INSERT_CONCURRENCY ?? 100)

function generateItem(itemSize, itemPropertiesSize, identifier = 0) {
    return {
        identifier,
        ...Object.fromEntries(Array.from({length: itemSize}, (e, i) => {
            return [`prop${i}`, Array.from({length: itemPropertiesSize}, () => 'i').join('')]
        }))
    }
}

async function insertManySlow(db, items) {
    //await wait(1000)
    const insertedItems = await db.collection('test_library').insertMany(items)
    return items.map((e, i) => ({...e, _id: insertedItems.insertedIds[i]}))
}

async function insertWithLibrary(db, item, context) {
    const newSize = context.pendingItems.push(item)
    const myIndex = newSize - 1

    if (context.free) {
        context.free = false
        const itemsToInsert = context.pendingItems
        context.pendingItems = []
        context.insertPromise = insertManySlow(db, itemsToInsert)

        const insertedItems = await context.insertPromise
        context.free = true

        return insertedItems[myIndex]

    } else {
        await context.insertPromise

        if (context.free) {
            context.free = false
            const itemsToInsert = context.pendingItems
            context.pendingItems = []
            context.insertPromise = insertManySlow(db, itemsToInsert)

            const insertedItems = await context.insertPromise
            context.free = true
            return insertedItems[myIndex]
        } else {
            const insertedItems = await context.insertPromise
            return insertedItems[myIndex]
        }
    }
}

async function testLibrary(db, items) {
    const context = {
        insertPromise: Promise.resolve(),
        pendingItems: [],
        free: true
        
    }
    const finalResult = await Promise.all(items.map(e => insertWithLibrary(db, e, context)))
    return finalResult
}

async function testPromiseBulk(db, items) {
    const context = new PromiseBulk((items) => db.collection('test_promise_bulk').insertMany(items), 10)
    const finalResult = await Promise.all(items.map(e => context.execute(e)))
    return finalResult
}

/**
 * 
 * @param {mongodb.Db} db 
 */
async function testMany(db, items) {
    await db.collection('test_many').insertMany(items)
}

async function testBulk(db, items) {
    await db.collection('test_bulk').bulkWrite(items.map(document => ({insertOne: {document}})))
}

async function testSingle(db, items, insertConcurrency) {
    await mapLimit(items, insertConcurrency, async (item) => {
        await db.collection('test_single').insertOne(item)
    })
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main(itemsCount, itemsSize, itemsPropertiesSize, insertConcurrency) {
    const client = new mongodb.MongoClient(MONGO_URI)
    await client.connect()
    const db = client.db()
    console.time('generateItems')
    const items = Array.from({length: itemsCount}, (e, i) => generateItem(itemsSize, itemsPropertiesSize, i))
    console.timeEnd('generateItems')
    console.time('bulk')
    await testBulk(db, items)
    console.timeEnd('bulk')
    await wait(1000)
    console.time('many')
    await testMany(db, items)
    console.timeEnd('many')
    await wait(1000)
    console.time('single')
    await testSingle(db, items, insertConcurrency), 
    console.timeEnd('single')
    await wait(1000)
    console.time('library')
    await testLibrary(db, items), 
    console.timeEnd('library')
    console.time('promise-bulk')
    await testPromiseBulk(db, items), 
    console.timeEnd('promise-bulk')
    await client.close()

}

main(ITEMS_COUNT, ITEMS_SIZE, ITEMS_PROPERTIES_SIZE, INSERT_CONCURRENCY).then(null, err => console.error(err))

