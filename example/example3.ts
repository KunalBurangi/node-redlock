import Redis from 'ioredis';
import { RedisClientType, createClient } from 'redis';
import { IoredisClient } from '../IoRedisClient';
import { RedisjsClient } from '../RedisJsClient';
import { Redlock } from '../redlock';

(async () => {
  // Initialize Ioredis clients
  const ioredisClients = [
    new Redis({ host: 'localhost', port: 6379 }),
  ].map(client => new IoredisClient(client));

  // Initialize RedisJS clients
  const redisjsClients = [
    createClient({ url: 'redis://localhost:6379' }),
  ];
  
  // Connect RedisJS clients
  await Promise.all(redisjsClients.map(client => client.connect()));
  const redisjsClientInstances = redisjsClients.map(client => new RedisjsClient(client as RedisClientType));

  // Combine both Ioredis and RedisJS clients
  const clients = [...ioredisClients, ...redisjsClientInstances];
  
  // Initialize Redlock instance
  const redlock = new Redlock(clients,'unique-owner-id');

  const resource = 'locks:example';
  const ttl = 10000; // 10 seconds

  // Custom retry strategy: exponential backoff
  const retryStrategy = (attempt: number) => Math.pow(2, attempt) * 100;

  // Attempt to acquire the lock with custom retry strategy
  const lock = await redlock.acquireLockWithCustomRetry(resource, ttl, retryStrategy);

  if (lock) {
    console.log(`Acquired lock on ${resource} with custom retry strategy`);

    // Renew the lock
    const renewed = await redlock.renewLock(lock.resource, lock.value, ttl);
    if (renewed) {
      console.log(`Renewed lock on ${resource}`);

      // Verify if the lock's TTL was updated and if the value is correct
      // Assuming you're using ioredis or RedisJS clients, this can be done as follows:
     // Use IoredisClient's method to get TTL
    const remainingTTL = await ioredisClients[0].getTTL(resource);
    const currentValue = await ioredisClients[0].get(resource);


      console.log(`Remaining TTL for lock: ${remainingTTL}ms`);
      console.log(`Lock value in Redis: ${currentValue}`);

      // Check if the TTL has been extended
      if (remainingTTL > 0 && currentValue === lock.value) {
        console.log('Lock TTL successfully renewed and value matches.');
      } else {
        console.log('Failed to renew lock correctly or the lock value does not match.');
      }

    } else {
      console.log(`Failed to renew lock on ${resource}`);
    }

    // Release the lock
    await redlock.releaseLock(resource, lock.value);
    console.log(`Released lock on ${resource}`);
  } else {
    console.log(`Failed to acquire lock on ${resource} with custom retry strategy`);
  }

  // Clean up: Close Redis clients
//   ioredisClients.forEach(client => (client as IoredisClient).client.quit());
//   await Promise.all(redisjsClients.map(client => client.quit()));
})();
