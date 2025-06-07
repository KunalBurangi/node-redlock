// Usage example
import Redis from 'ioredis';
import {  RedisClusterType, createClient, createCluster } from 'redis';
import { IoredisClient } from '../IoRedisClient';
import { RedisjsClient } from '../RedisJsClient';
import { Redlock } from '../redlock';

(async () => {
  const ioredisClients = [
    new Redis.Cluster([
      { host: 'localhost', port: 7001 },
      { host: 'localhost', port: 7002 },
      { host: 'localhost', port: 7003 }
    ],
    {
      scaleReads: "slave",
    }),

  ].map(client => new IoredisClient(client));

  const redisjsClients = [
    // createCluster({ rootNodes:[{url: 'redis://localhost:7001' },
    //   {url: 'redis://localhost:7002' },
    //   {url: 'redis://localhost:7003' }
    // ]}),
  ];

  await Promise.all(redisjsClients.map(client => client.connect()));
  const redisjsClientInstances = redisjsClients.map(client => new RedisjsClient(client as RedisClusterType));

  // Choose the set of clients you want to use
  const clients = [...ioredisClients, ...redisjsClientInstances];

  const redlock = new Redlock(clients,'unique-owner-id');

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
