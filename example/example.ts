// Usage example
import Redis from 'ioredis';
import { RedisClientType, createClient } from 'redis';
import { IoredisClient } from '../IoRedisClient';
import { RedisjsClient } from '../RedisJsClient';
import { Redlock } from '../redlock';

(async () => {
  const ioredisClients = [
    new Redis({ host: 'localhost', port: 6379 }),

  ].map(client => new IoredisClient(client));

  const redisjsClients = [
    createClient({ url: 'redis://localhost:6379' }),
  ];

  await Promise.all(redisjsClients.map(client => client.connect()));
  const redisjsClientInstances = redisjsClients.map(client => new RedisjsClient(client as RedisClientType));

  // Choose the set of clients you want to use
  const clients = [...ioredisClients, ...redisjsClientInstances];

  const redlock = new Redlock(clients);

  const resource = 'locks:example';
  const ttl = 10000; // 10 seconds

  const lock = await redlock.acquireLock(resource, ttl);

  if (lock) {
    console.log(`Acquired lock on ${resource}`);
    
    // Do your critical section work here
    
    await redlock.releaseLock(resource, lock.value);
    console.log(`Released lock on ${resource}`);
  } else {
    console.log(`Failed to acquire lock on ${resource}`);
  }

//   ioredisClients.forEach(client => (client as IoredisClient).client.quit());
//   await Promise.all(redisjsClients.map(client => client.quit()));
})();
