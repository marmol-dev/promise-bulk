
[![NPM](https://nodei.co/npm/promise-bulk.png?compact=true)](https://npmjs.org/package/promise-bulk)

Write efficient bulk algorithms without modifying your existing codebase.

```js
const app = express()
app.post('/comments', async (req, res) => {
    const bodyComment = req.body
    const insertedComment = await insertBulkInstance.execute(bodyComment)
    res.json(insertedComment)
})
```

What is `insertBulkInstance`?

```js
const insertBulkInstance = new PromiseBulk((commentsArr) => {
    return db.collection('comments').insertMany(commentsArr)
})
```

Allows to insert items in a atomic way but doing a efficient bulk operation in the background.

# When I should use this?

Imagine you have two functions:

- `insertInDatabaseOneItem`
- `insertInDatabaseManyItemsAtOnce`

What do you think is more efficient: call the first function 100 times or the second function one time with 100 items?

Depending on your database system, probabily the second option is much more efficient. 

So, whats the problem?

Our existing logic is frequently written for 1 item so in many scenarios is complex to write it for many items.

This library allows to easily convert the calls from one item (`insertInDatabaseOneItem` in the example) into calls of many items (`insertInDatabaseManyItemsAtOnce` in the example).

# Install

`npm install --save promise-bulk`

or

`yarn add promise-bulk`

or

`pnpm add --save pnpm`

# Documentation

Detailed information and documentation about this library and how to use it can be found in [docs](https://tomymolina.github.io/promise-bulk/modules.html).

# Example

We have the scenario of a comments platform that receives so many comments per second using a REST API.
Every REST API call inserts a SINGLE comment into the database. 

With 100 users sending comments per second we are executing 100 `database.insertOne(comment)` in parallel.

Despite of being more efficient to insert all the comments at once, refactoring this code to do `database.insertMany(commentsList)` is hard to implement.

With this library we can convert the atomic insert of one comment into a grouped insert of many comments.

Atomic:

![Atomic](https://github.com/tomymolina/promise-bulk/raw/master/static/atomic.png)

And with `promise-bulk`:

![Bulk](https://github.com/tomymolina/promise-bulk/raw/master/static/bulk.png)

The example total time is near 2x times faster in bulk scenario.

# Real use case

See [examples/mongo/README.md](./examples/mongo/README.md) for real results and performance.

# License

[License](./LICENSE.md)