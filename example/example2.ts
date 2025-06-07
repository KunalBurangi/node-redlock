// src/example.ts
import Redis from 'ioredis';
import { RedisClientType, createClient } from 'redis';
import { IoredisClient } from '../IoRedisClient';
import { RedisjsClient } from '../RedisJsClient';
import {Redlock} from '../redlock';

(async () => {
  // Initialize ioredis clients
  const ioredisClients = [
    new Redis({ host: 'localhost', port: 6379 }),

  ].map(client => new IoredisClient(client));

  // Initialize redisjs clients
  const redisjsClients = [
    createClient({ url: 'redis://localhost:6379' })
  ];

  await Promise.all(redisjsClients.map(client => client.connect()));
  const redisjsClientInstances = redisjsClients.map(client => new RedisjsClient(client as RedisClientType));

  // Combine all clients
  const clients = [...ioredisClients, ...redisjsClientInstances];
  const redlock = new Redlock(clients,'unique-owner-id');

  const resource = 'locks:example';
  const ttl = 10000; // 10 seconds

  // First attempt to acquire the lock
  const lock1 = await redlock.acquireLock(resource, ttl);

  if (lock1) {
    console.log(`Acquired first lock on ${resource}`);
  } else {
    console.log(`Failed to acquire first lock on ${resource}`);
  }

  // Second attempt to acquire the lock
  const lock2 = await redlock.acquireLock(resource, ttl);

  if (lock2) {
    console.log(`Acquired second lock on ${resource} (this should not happen)`);
  } else {
    console.log(`Failed to acquire second lock on ${resource} (expected)`);
  }

  // Release the first lock
  if (lock1) {
    await redlock.releaseLock(resource, lock1.value);
    console.log(`Released first lock on ${resource}`);
  }

//   // Clean up
//   ioredisClients.forEach(client => (client as IoredisClient).client.quit());
//   await Promise.all(redisjsClients.map(client => client.quit()));
})();
