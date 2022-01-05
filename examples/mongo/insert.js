const mongodb = require('mongodb')
const mapLimit = require('promise-map-limit')
const {PromiseBulk} = require('promise-bulk')

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost/bulk_node'
const ITEMS_COUNT = Number(process.env.ITEMS_COUNT ?? 10 * 1000)
const ITEMS_SIZE = Number(process.env.ITEMS_SIZE ?? 5)
const ITEMS_PROPERTIES_SIZE = Number(process.env.ITEMS_PROPERTIES_SIZE ?? 30)
const INSERT_CONCURRENCY = Number(process.env.INSERT_CONCURRENCY ?? 100)
const TEST_ITERATIONS = Number(process.env.TEST_ITERATIONS ?? 10)


console.log({
    MONGO_URI,
    ITEMS_COUNT,
    ITEMS_SIZE,
    ITEMS_PROPERTIES_SIZE,
    INSERT_CONCURRENCY,
    TEST_ITERATIONS
})

function generateItem(itemSize, itemPropertiesSize, identifier = 0) {
    return {
        identifier,
        ...Object.fromEntries(Array.from({length: itemSize}, (e, i) => {
            return [`prop${i}`, Array.from({length: itemPropertiesSize}, () => 'i').join('')]
        }))
    }
}

async function testPromiseBulk(db, items, bulkConcurrency) {
    const context = new PromiseBulk((items) => db.collection('test_promise_bulk_' + bulkConcurrency).insertMany(items), bulkConcurrency)
    const finalResult = await Promise.all(items.map(e => context.execute(e)))
    return finalResult
}


async function testMany(db, items) {
    await db.collection('test_many').insertMany(items)
}

async function testBulk(db, items) {
    await db.collection('test_bulk').bulkWrite(items.map(document => ({insertOne: {document}})))
}

async function testOneWithConcurrency(db, items, insertConcurrency) {
    await mapLimit(items, insertConcurrency, async (item) => {
        await db.collection('test_single_concurrency').insertOne(item)
    })
}

async function testOneAll(db, items) {
    await Promise.all(items.map(item => db.collection('test_single_all').insertOne(item)))
}

const times = {}

function startTime(key) {
    times[key] = new Date()
}

function endTime(key) {
    return (+(new Date()) - times[key])
}


async function test(itemsCount, itemsSize, itemsPropertiesSize, insertConcurrency) {
    const times = {}
    const client = new mongodb.MongoClient(MONGO_URI)
    await client.connect()
    const db = client.db()
    //console.log('Preparing test')
    startTime('generateItems')
    const items = Array.from({length: itemsCount}, (e, i) => generateItem(itemsSize, itemsPropertiesSize, i))
    times['generateItems'] = endTime('generateItems')
    //console.log('Running test')
    startTime('mongodb.bulkWrite')
    await testBulk(db, items)
    times['mongodb.bulkWrite'] = endTime('mongodb.bulkWrite')
    //await wait(1000)
    startTime('mongodb.insertMany')
    await testMany(db, items)
    times['mongodb.insertMany'] = endTime('mongodb.insertMany')
    //await wait(1000)
    startTime('mongodb.insertOne(concurrency-limit)')
    await testOneWithConcurrency(db, items, insertConcurrency), 
    times['mongodb.insertOne(concurrency-limit)'] = endTime('mongodb.insertOne(concurrency-limit)')
    //await wait(1000)
    startTime('mongodb.insertOne(promise-all)')
    await testOneAll(db, items), 
    times['mongodb.insertOne(promise-all)'] = endTime('mongodb.insertOne(promise-all)')
    //await wait(1000)
    startTime('promise-bulk(mongodb-insert-many)')
    await testPromiseBulk(db, items), 
    times['promise-bulk(mongodb-insert-many)'] = endTime('promise-bulk(mongodb-insert-many)')
    //await wait(1000)
    startTime('promise-bulk-10-replicas(mongodb-insert-many)')
    await testPromiseBulk(db, items, 10), 
    times['promise-bulk-10-replicas(mongodb-insert-many)'] = endTime('promise-bulk-10-replicas(mongodb-insert-many)')
    //console.log('Test finished')
    await client.close()
    return times
}

async function main(itemsCount, itemsSize, itemsPropertiesSize, insertConcurrency, testIterations) {
    console.log(`Going to test ${testIterations} iterations`)
    const timesArr = []
    for (let i = 0; i < testIterations; i++) {
        console.log(`Iteration ${i+1}/${testIterations}`)
        timesArr.push(await test(itemsCount, itemsSize, itemsPropertiesSize, insertConcurrency))
    }

    const totalTimes = timesArr.reduce((accum, e) => {
        return Object.fromEntries(Object.entries(e).map(([key, v]) => [key, (accum[key] ?? 0) + (v / testIterations)]))
    }, {})

    console.log('Average result times')
    console.table(totalTimes)
}``

main(ITEMS_COUNT, ITEMS_SIZE, ITEMS_PROPERTIES_SIZE, INSERT_CONCURRENCY, TEST_ITERATIONS).then(null, err => console.error(err))

