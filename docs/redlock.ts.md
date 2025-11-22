 # Software Design Document

## Introduction and Overview

This document describes the design of a Redlock implementation in TypeScript. The system is designed to provide a distributed lock using the Redis database as the backend. The Redlock algorithm is used to ensure that multiple clients can acquire locks on the same resource without deadlocks or race conditions.

## System Architecture

The system consists of several components:

* A `RedisClient` interface that defines the methods for interacting with a Redis database.
* The `Redlock` class, which is responsible for acquiring, releasing, and renewing locks on a specified resource using the Redlock algorithm.

## Data Design

The data design involves the use of keys in the Redis database to represent locks. Each key consists of three parts: the resource being locked, the lock value (a unique string), and the time-to-live for the lock. The Redlock algorithm uses these keys to ensure that only one client can acquire a lock on a particular resource at a time.

## Interface Design

The `RedisClient` interface defines the methods for interacting with a Redis database:

* `set(resource: string, value: string, options: SetOptions): Promise<SetResult>`: Attempts to acquire a lock on a single Redis client.
* `eval(script: string, keys: string[], args: any[]): Promise<EvalResult>`: Releases a lock on a single Redis client.

The `Redlock` class provides the following methods for acquiring, releasing, and renewing locks:

* `acquireLockInstance(client: RedisClient, resource: string, value: string, ttl: number): Promise<boolean>`: Attempts to acquire a lock on a single Redis client.
* `releaseLockInstance(client: RedisClient, lock: Lock): Promise<number>`: Releases a lock on a single Redis client.
* `acquireLock(resource: string, ttl: number): Promise<Lock | null>`: Attempts to acquire a lock on the specified resource using the Redlock algorithm.
* `acquireLockWithCustomRetry(resource: string, ttl: number, retryStrategy: (attempt: number) => number): Promise<Lock | null>`: Attempts to acquire a lock on the specified resource using a custom retry strategy.
* `tryAcquire(resource: string, value: string, ttl: number): Promise<number>`: Attempts to acquire a lock on the specified resource across all clients.
* `releaseLock(resource: string, value: string): Promise<void>`: Releases a lock on the specified resource.
* `renewLock(resource: string, value: string, ttl: number): Promise<boolean>`: Renews a lock on the specified resource.
* `sleep(ms: number): Promise<void>`: Sleeps for the specified number of milliseconds.

## Component Design

The `Redlock` class is responsible for managing the acquisition, release, and renewal of locks using the Redlock algorithm. The class takes an array of `RedisClient` objects in its constructor, which it uses to attempt lock operations across all clients. The class also has a retry count and a retry delay that can be configured during initialization.

The `RedisClient` interface defines the methods for interacting with a Redis database, including setting keys with a unique value and evaluating Lua scripts.

## User Interface Design

There is no user interface for this system as it is designed to be used programmatically by other applications that need to acquire locks using the Redlock algorithm.

## Assumptions and Dependencies

* The Redis database must be installed and running on the target environment.
* The `RedisClient` objects passed to the `Redlock` constructor must have valid `set` and `eval` methods that can be used to interact with the Redis database.
* The system assumes that the Redlock algorithm is correct and will work correctly in all cases.

## Glossary of Terms

* `Redlock`: A class that provides a distributed lock using the Redlock algorithm.
* `RedisClient`: An interface that defines the methods for interacting with a Redis database.
* `Lock`: An object representing a lock on a specified resource, consisting of the resource name, the lock value, and the time-to-live for the lock.
* `Redlock algorithm`: A distributed algorithm for acquiring locks that uses a combination of timeouts, retry counts, and drift factors to avoid deadlocks and race conditions.
* `SetOptions`: An object defining options for setting keys in a Redis database, including the NX option (for "not exists") and the PX option (for "expire").
* `SetResult`: The result of the `set` method on a Redis client, indicating whether the operation was successful or not.
* `EvalResult`: The result of the `eval` method on a Redis client, indicating the number of keys that were affected by the operation.
* `SetOptions`, `SetResult`, and `EvalResult` are defined in the `redis` package for interacting with a Redis database.

## Class Diagram (in Mermaid syntax)
```mermaid
class RedisClient {
    set(resource: string, value: string, options: SetOptions): Promise<SetResult>
    eval(script: string, keys: string[], args: any[]): Promise<EvalResult>
}

class Redlock {
    private clients: RedisClient[];
    private retryCount: number;
    private retryDelay: number;
    private driftFactor: number;
    
    constructor(clients: RedisClient[], retryCount = 3, retryDelay = 200, driftFactor = 0.01) {
        this.clients = clients;
        this.retryCount = retryCount;
        this.retryDelay = retryDelay;
        this.driftFactor = driftFactor;
    }
    
    private async acquireLockInstance(client: RedisClient, resource: string, value: string, ttl: number): Promise<boolean> { ... }
    
    private async releaseLockInstance(client: RedisClient, lock: Lock): Promise<number> { ... }
    
    public async acquireLock(resource: string, ttl: number): Promise<Lock | null> { ... }
    
    public async acquireLockWithCustomRetry(resource: string, ttl: number, retryStrategy: (attempt: number) => number): Promise<Lock | null> { ... }
    
    private async tryAcquire(resource: string, value: string, ttl: number): Promise<number> { ... }
    
    public async releaseLock(resource: string, value: string): Promise<void> { ... }
    
    public async renewLock(resource: string, value: string, ttl: number): Promise<boolean> { ... }
    
    private sleep(ms: number): Promise<void> { ... }
}
``` 