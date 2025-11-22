 # IoRedisClient.ts SDD

## Introduction and Overview

This document provides a detailed overview of the code found in `IoRedisClient.ts`. The file is responsible for implementing a Redis client using the `ioredis` library. The class `IoredisClient` is created to handle interactions with a Redis database using the provided `RedisClient` interface as a reference.

## System Architecture

The system architecture depicted in this document utilizes the `ioredis` library, which acts as an abstraction layer between the client and the Redis database. The `IoredisClient` class is responsible for interacting with the Redis database using the `Redis` object provided during its construction. The `RedisClient` interface serves as a contract defining the required methods for this interaction.

![System Architecture](https://i.imgur.com/GyV0Wc.png)

## Data Design

The data design in this system involves storing and retrieving data from a Redis database using key-value pairs. The keys serve as unique identifiers for the values stored within the database.

### Key-Value Pair Structure

In this implementation, keys are strings, and values can be of any type. The specific data type of the value is not relevant to the `IoredisClient` class.

### Redis Database Operations

The `IoredisClient` class implements methods for setting, getting, and evaluating scripts in the Redis database:

- `set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null>`
  - This method stores a key-value pair in the Redis database, with an optional expiration time (PX) and the 'NX' flag to prevent overwriting existing keys.

- `eval(script: string, keys: string[], args: string[]): Promise<number>`
  - This method executes a script on the Redis server, passing the provided arguments (keys and values) to the script. The script can perform any operation supported by the Redis protocol.

- `getTTL(resource: string): Promise<number>`
  - This method retrieves the time to live (TTL) of a key from the Redis database, indicating when the value associated with the key will expire.

- `get(resource: string): Promise<string | null>`
  - This method retrieves the value associated with a key from the Redis database.

## Interface Design

The `RedisClient` interface is used to define the contract for the interactions between the client and the Redis database:
```typescript
export interface RedisClient {
  set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null>;
  eval(script: string, keys: string[], args: string[]): Promise<number>;
  getTTL(resource: string): Promise<number>;
  get(resource: string): Promise<string | null>;
}
```
This interface ensures that any implementation of the `IoredisClient` class adheres to this contract, allowing for interchangeable Redis client implementations.

## Component Design

The primary component in this system is the `IoredisClient` class, which serves as a proxy for interacting with a Redis database using the provided `Redis` object. The `RedisClient` interface further encapsulates the interactions and ensures that any implementation of the `IoredisClient` class follows the required method structure.

![Component Design](https://i.imgur.com/GyV0Wc.png)

## User Interface Design

The `IoredisClient` class itself does not have a direct user interface, as it is meant to be used as an abstract layer for interacting with a Redis database. The user interface would typically be provided by the application or service that utilizes this class.

## Assumptions and Dependencies

The following assumptions and dependencies are present in this system:

- The `ioredis` library is required to communicate with the Redis database. This dependency must be managed separately from the codebase, as it is not included within the file.

- The Redis server is assumed to be running and accessible at the time of implementation.

## Glossary of Terms

- **Redis Database**: A NoSQL key-value store database, known for its high performance and in-memory data structures.

- **IoredisClient**: A class responsible for interacting with a Redis database using the `ioredis` library.

- **Redis Client**: An interface defining the contract for interacting with a Redis database.

- **Key**: A unique identifier used to store and retrieve data from a Redis database.

- **Value**: The actual data stored within a Redis database, associated with its corresponding key.

- **TTL (Time To Live)**: The amount of time a value remains in the Redis database before it expires.

## Class Diagram (in Mermaid syntax)

Here is the class diagram in Mermaid syntax:
```mermaid
class IoredisClient {
  +constructor(client: Redis);
  +set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null>;
  +eval(script: string, keys: string[], args: string[]): Promise<number>;
  +getTTL(resource: string): Promise<number>;
  +get(resource: string): Promise<string | null>;
}

class RedisClient {
  +set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null>;
  +eval(script: string, keys: string[], args: string[]): Promise<number>;
  +getTTL(resource: string): Promise<number>;
  +get(resource: string): Promise<string | null>;
}
```
This diagram shows the relationship between the `IoredisClient` class and the `RedisClient` interface. The `IoredisClient` class is responsible for implementing the methods defined in the `RedisClient` interface to interact with a Redis database using the provided `Redis` object. 