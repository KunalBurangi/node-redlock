# Redlock Implementation in TypeScript

This project provides a Redlock implementation in TypeScript, compatible with both `ioredis` and `redisjs`.

## Installation

1. Clone the repository:
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

## Usage

### Initialize Redis Clients

Initialize both `ioredis` and `redis` clients:

```typescript
import Redis from 'ioredis';
import { createClient } from 'redis';
import { IoredisClient } from './src/IoredisClient';
import { RedisjsClient } from './src/RedisjsClient';
import Redlock from './src/Redlock';

(async () => {
  const ioredisClients = [
    new Redis({ host: 'localhost', port: 6379 }),
    new Redis({ host: 'localhost', port: 6380 }),
    new Redis({ host: 'localhost', port: 6381 }),
  ].map(client => new IoredisClient(client));

  const redisjsClients = [
    createClient({ url: 'redis://localhost:6379' }),
    createClient({ url: 'redis://localhost:6380' }),
    createClient({ url: 'redis://localhost:6381' }),
  ];

  await Promise.all(redisjsClients.map(client => client.connect()));
  const redisjsClientInstances = redisjsClients.map(client => new RedisjsClient(client));

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

  ioredisClients.forEach(client => (client as IoredisClient).client.quit());
  await Promise.all(redisjsClients.map(client => client.quit()));
})();
