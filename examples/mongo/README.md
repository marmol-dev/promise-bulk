# promise-bulk/examples/mongo

## Introduction

This project runs different MongoDB insert commands (one, many, with bulk library) and benchmarks their total time.

## Prerequisites

- Node.js >= 8.
- MongoDB.

## Configuration

The following environmental variables allow to configure the test:

- MONGO_URI: MongoDB URI. Default = `mongodb://localhost/bulk_node`
- ITEMS_COUNT: total items to insert in each test. Default = `10000`
- ITEMS_SIZE: total number of properties of the MongoDB document. Default = `5`
- ITEMS_PROPERTIES_SIZE: string length of each MongoDB document propert. Default = `30`.
- INSERT_CONCURRENCY: max insert concurrency on `testSingle`. Default =  `100`.
- TEST_ITERATIONS: how many iterations the test will be executed. Default = `10`.

## Test

Run `npm run test`.

## Performance results 

The following performance results were given running on my computer. The final performance depends on your CPU performance, hard disk and other hardware and software specifications. Times are returned in ms.

```bash
$ export TEST_ITERATIONS=4 && npm test

> promise-bulk-examples-mongo@0.0.1 test /Users/marmol/dev/personal/promise-bulk/examples/mongo
> node insert

{
  MONGO_URI: 'mongodb://localhost/bulk_node',
  ITEMS_COUNT: 10000,
  ITEMS_SIZE: 5,
  ITEMS_PROPERTIES_SIZE: 30,
  INSERT_CONCURRENCY: 100,
  TEST_ITERATIONS: 4
}
Going to test 4 iterations
Iteration 1/4
Iteration 2/4
Iteration 3/4
Iteration 4/4
Average result times
┌───────────────────────────────────────────────┬────────┐
│                    (index)                    │ Values │
├───────────────────────────────────────────────┼────────┤
│                 generateItems                 │  118   │
│               mongodb.bulkWrite               │  207   │
│              mongodb.insertMany               │ 187.5  │
│     mongodb.insertOne(concurrency-limit)      │ 1225.5 │
│        mongodb.insertOne(promise-all)         │ 914.75 │
│       promise-bulk(mongodb-insert-many)       │ 201.75 │
│ promise-bulk-10-replicas(mongodb-insert-many) │  132   │
└───────────────────────────────────────────────┴────────┘

```



