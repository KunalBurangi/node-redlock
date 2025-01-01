# Redlock Implementation in TypeScript

This library provides a robust and distributed locking mechanism using the Redlock algorithm implemented in TypeScript. It allows you to acquire, release, and renew locks on shared resources across multiple Redis instances.

---

## Features

- Acquire a distributed lock with configurable retry logic.
- Release a lock safely to ensure resource consistency.
- Renew locks to extend the time-to-live (TTL) for a lock.
- Support for custom retry strategies.
- Compatibility with multiple Redis clients for high availability.

---

## Installation

1. Clone the repository or copy the `Redlock.ts` file into your project.
2. Install the required dependencies using npm or yarn:

```bash
npm install ioredis
```

---

## Usage

### Setup

Create Redis clients that implement the `RedisClient` interface and pass them to the `Redlock` class. For example, using `ioredis`:

```typescript
import Redis from 'ioredis';
import { Redlock } from './Redlock';

const redisClients = [
  new Redis({ host: '127.0.0.1', port: 6379 }),
  new Redis({ host: '127.0.0.1', port: 6380 }),
  new Redis({ host: '127.0.0.1', port: 6381 }),
];

const redlock = new Redlock(redisClients);
```

---

### Acquiring a Lock

You can acquire a lock on a resource with a specific TTL:

```typescript
(async () => {
  const lock = await redlock.acquireLock('my-resource', 5000); // Lock for 5000ms
  if (lock) {
    console.log('Lock acquired:', lock);
  } else {
    console.log('Failed to acquire lock');
  }
})();
```

### Acquiring a Lock with Custom Retry Strategy

To customize the retry strategy, pass a function to `acquireLockWithCustomRetry`:

```typescript
(async () => {
  const retryStrategy = (attempt: number) => 100 * (attempt + 1); // Exponential backoff
  const lock = await redlock.acquireLockWithCustomRetry('my-resource', 5000, retryStrategy);
  if (lock) {
    console.log('Lock acquired with custom retry:', lock);
  } else {
    console.log('Failed to acquire lock with custom retry');
  }
})();
```

---

### Releasing a Lock

To release a lock after use:

```typescript
(async () => {
  const lock = await redlock.acquireLock('my-resource', 5000);
  if (lock) {
    await redlock.releaseLock(lock.resource, lock.value);
    console.log('Lock released');
  }
})();
```

---

### Renewing a Lock

Extend the TTL of an existing lock:

```typescript
(async () => {
  const lock = await redlock.acquireLock('my-resource', 5000);
  if (lock) {
    const renewed = await redlock.renewLock(lock.resource, lock.value, 5000);
    if (renewed) {
      console.log('Lock renewed');
    } else {
      console.log('Failed to renew lock');
    }
  }
})();
```

---

## API Reference

### `acquireLock(resource: string, ttl: number): Promise<Lock | null>`

Attempts to acquire a lock on the specified resource.  
**Parameters:**
- `resource`: The resource to lock.
- `ttl`: The time-to-live for the lock in milliseconds.

**Returns:** A `Lock` object if successful, otherwise `null`.

---

### `acquireLockWithCustomRetry(resource: string, ttl: number, retryStrategy: (attempt: number) => number): Promise<Lock | null>`

Attempts to acquire a lock using a custom retry strategy.  
**Parameters:**
- `resource`: The resource to lock.
- `ttl`: The time-to-live for the lock in milliseconds.
- `retryStrategy`: A function that determines the delay before the next retry attempt.

**Returns:** A `Lock` object if successful, otherwise `null`.

---

### `releaseLock(resource: string, value: string): Promise<void>`

Releases a lock on the specified resource.  
**Parameters:**
- `resource`: The resource to unlock.
- `value`: The unique lock value.

**Returns:** A `Promise` that resolves when the lock is released.

---

### `renewLock(resource: string, value: string, ttl: number): Promise<boolean>`

Renews the TTL for an existing lock.  
**Parameters:**
- `resource`: The resource to renew the lock on.
- `value`: The unique lock value.
- `ttl`: The new TTL in milliseconds.

**Returns:** `true` if the lock was successfully renewed, otherwise `false`.

---

## Notes

- Ensure all Redis clients are connected and synchronized for optimal performance.
- Use a unique `value` for each lock to prevent accidental unlocking by other processes.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
