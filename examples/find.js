const mongodb = require('mongodb')
const mapLimit = require('promise-map-limit')
const {PromiseBulk} = require('../src/lib')

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost/bulk_node'
const ITEMS_COUNT = Number(process.env.ITEMS_COUNT ?? 300 * 1000)
const ITEMS_SIZE = Number(process.env.ITEMS_SIZE ?? 5)
const ITEMS_PROPERTIES_SIZE = Number(process.env.ITEMS_PROPERTIES_SIZE ?? 30)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 300 * 1000)

function generateItem(itemSize, itemPropertiesSize, identifier = 0) {
    return {
        identifier,
        ...Object.fromEntries(Array.from({length: itemSize}, (e, i) => {
            return [`prop${i}`, Array.from({length: itemPropertiesSize}, () => 'i').join('')]
        }))
    }
}


async function findWithLibrary(col, item, context) {
    const newSize = context.pendingItems.push(item)
    const myIndex = newSize - 1

    if (context.free) {
        context.free = false
        const itemsToFind = context.pendingItems
        context.pendingItems = []
        context.insertPromise = testFindSorted(col, itemsToFind)

        const insertedItems = await context.insertPromise
        context.free = true

        return insertedItems[myIndex]

    } else {
        await context.insertPromise

        if (context.free) {
            context.free = false
            const itemsToFind = context.pendingItems
            context.pendingItems = []
            context.insertPromise = testFindSorted(col, itemsToFind)

            const insertedItems = await context.insertPromise
            context.free = true
            return insertedItems[myIndex]
        } else {
            const insertedItems = await context.insertPromise
            return insertedItems[myIndex]
        }
    }
}

async function testAlgorithm(col, items) {
    const context = {
        insertPromise: Promise.resolve(),
        pendingItems: [],
        free: true
        
    }
    const finalResult = await Promise.all(items.map(e => findWithLibrary(col, e, context)))
    return finalResult
}

async function testLibrary(col, items, concurrency = 1) {
    const promiseBulk = new PromiseBulk(
        (auxItems) => testFindSorted(col, auxItems),
        concurrency
    )
    const finalResult = await Promise.all(items.map(e => promiseBulk.execute(e)))
    return finalResult
}

/**
 * 
 * @param {mongodb.Collection} col 
 */
async function testFindSorted(col, ids) {
    const res = await col.find({_id: {$in: ids}}).toArray()
    const map = Object.fromEntries(res.map((e,i) => [e._id, e]))
    return ids.map(id => map[id])
}

async function testFindRaw(col, ids) {
    return col.find({_id: {$in: ids}}).toArray()
}

/**
 * 
 * @param {mongodb.Collection} col 
 * @param {*} ids 
 * @param {*} concurrency 
 */
async function testFindByIdLimit(col, ids, concurrency) {
    return mapLimit(ids, concurrency, async (item) => {
        return col.findOne({_id: item})
    })
}

/**
 * 
 * @param {mongodb.Collection} col 
 * @param {*} ids 
 * @param {*} concurrency 
 */
 async function testFindByIdAll(col, ids) {
    return Promise.all(ids.map(async (item) => {
        return col.findOne({_id: item})
    }))
}


function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main(itemsCount, itemsSize, itemsPropertiesSize, concurrency) {
    const client = new mongodb.MongoClient(MONGO_URI)
    await client.connect()
    const db = client.db()
    console.time('generateItems')
    const items = Array.from({length: itemsCount}, (e, i) => generateItem(itemsSize, itemsPropertiesSize, i))
    console.timeEnd('generateItems')
    console.time('insertItems')
    const col = db.collection('test_find') 
    await col.deleteMany()
    const result = await  col.insertMany(items)
    let [first, second, ...rest] = Object.values(result.insertedIds)
    const ids = [second, first, ...rest]
    //console.log({ids})
    console.timeEnd('insertItems')

    console.time('many')
    await testFindSorted(col, ids)
    //console.log('findCount', findItems.length)
    console.timeEnd('many')
    await wait(1000)
    // console.time('single_all')
    // await testFindByIdAll(col, ids)
    // //console.log('findByIdCount', findByIdItems.length) 
    // console.timeEnd('single_all')
    // await wait(1000)
    // console.time('single_limit')
    // await testFindByIdLimit(col, ids, concurrency)
    // //console.log('findByIdCount', findByIdItems.length) 
    // console.timeEnd('single_limit')
    // await wait(1000)
    console.time('algorithm')
    await testAlgorithm(col, ids)
    console.timeEnd('algorithm')
    await wait(1000)
    console.time('library')
    await testLibrary(col, ids)
    //console.log('res', res)
    console.timeEnd('library')
    await wait(1000)
    console.time('library_x20')
    await testLibrary(col, ids, 20)
    //console.log('res', res)
    console.timeEnd('library_x20')
    await client.close()

}

main(ITEMS_COUNT, ITEMS_SIZE, ITEMS_PROPERTIES_SIZE, CONCURRENCY).then(null, err => console.error(err))

