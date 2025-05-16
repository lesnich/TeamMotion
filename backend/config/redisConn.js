// const redis = require('redis')
//
// const client = redis.createClient({
//     password: process.env.REDIS_PASSWORD,
//     socket: {
//         host: process.env.REDIS_URL,
//         port: process.env.REDIS_PORT
//     }
// })
//
// client.on('error', (err) => {
//     console.error('Redis error: ', err)
// })
//
// client.on('ready', () => {
//     console.log('Connected to Redis')
// })
//
// client.connect()
//
// module.exports = client
module.exports = {
    get: async () => null,
    set: async () => {},
    del: async () => {}
}
