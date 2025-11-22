// redlock.test.ts
import { expect } from 'chai';
import { IoredisClientMock } from './IoredisClientMock';
import { RedisjsClientMock } from './RedisjsClientMock';
import { Redlock } from '../redlock';
import sinon from 'sinon';

describe('Redlock', () => {
  let ioredisClient1: IoredisClientMock;
  let ioredisClient2: IoredisClientMock;
  let redisjsClient1: RedisjsClientMock;
  let redisjsClient2: RedisjsClientMock;
  let redlock: Redlock;

  beforeEach(() => {
    ioredisClient1 = new IoredisClientMock();
    ioredisClient2 = new IoredisClientMock();
    redisjsClient1 = new RedisjsClientMock();
    redisjsClient2 = new RedisjsClientMock();

    const clients = [ioredisClient1, ioredisClient2, redisjsClient1, redisjsClient2];
    redlock = new Redlock(clients);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should acquire and release a lock', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.not.be.null;
    expect(lock!.resource).to.equal(resource);
    // Basic UUID check (version 4 UUIDs are 36 chars long)
    expect(lock!.value).to.have.lengthOf(36);

    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    await redlock.releaseLock(resource, lock!.value);

    sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(ioredisClient2.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient2.eval, sinon.match.string, [resource], [lock!.value]);
  });

  it('should fail to acquire a lock if not enough instances succeed', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves(null);
    redisjsClient1.set.resolves(null);
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.be.null;
  });

  it('should retry acquiring a lock', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.onCall(0).resolves(null);
    ioredisClient1.set.onCall(1).resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.not.be.null;
    expect(lock!.resource).to.equal(resource);

    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    await redlock.releaseLock(resource, lock!.value);

    sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(ioredisClient2.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient2.eval, sinon.match.string, [resource], [lock!.value]);
  });
  it('should acquire a lock with custom retry strategy', async () => {
    const resource = 'locks:test';
    const ttl = 1000;
    const retryStrategy = (attempt: number) => attempt * 100;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLockWithCustomRetry(resource, ttl, retryStrategy);
    expect(lock).to.not.be.null;
    expect(lock!.resource).to.equal(resource);

    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    await redlock.releaseLock(resource, lock!.value);

    sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(ioredisClient2.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient2.eval, sinon.match.string, [resource], [lock!.value]);
  });

  it('should fail to acquire a lock with custom retry strategy if not enough instances succeed', async () => {
    const resource = 'locks:test';
    const ttl = 1000;
    const retryStrategy = (attempt: number) => attempt * 100;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves(null);
    redisjsClient1.set.resolves(null);
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLockWithCustomRetry(resource, ttl, retryStrategy);
    expect(lock).to.be.null;
  });

  it('should renew a lock', async () => {
    const resource = 'locks:test';
    const ttl = 1000;
    const value = 'unique-lock-value';

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.not.be.null;
    expect(lock!.resource).to.equal(resource);
    // Mock the eval method to simulate successful renewal
    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    const success = await redlock.renewLock(resource, value, ttl);
    expect(success).to.be.true;

    // Verify that eval was called with the correct arguments
    const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
    sinon.assert.calledWith(ioredisClient1.eval, script, [resource], [value, ttl.toString()]);
    sinon.assert.calledWith(ioredisClient2.eval, script, [resource], [value, ttl.toString()]);
    sinon.assert.calledWith(redisjsClient1.eval, script, [resource], [value, ttl.toString()]);
    sinon.assert.calledWith(redisjsClient2.eval, script, [resource], [value, ttl.toString()]);
  });


  it('should fail to renew a lock if not all instances succeed', async () => {
    const resource = 'locks:test';
    const ttl = 1000;
    const value = 'unique-lock-value';

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves(null);
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves(null);

    // Mock eval to return 0 (failure) for some clients
    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(0);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(0);

    const success = await redlock.renewLock(resource, value, ttl);
    expect(success).to.be.false;
  });

  it('should emit events', async () => {
    const resource = 'locks:test';
    const ttl = 1000;
    const acquiredSpy = sinon.spy();
    const releasedSpy = sinon.spy();

    redlock.on('acquired', acquiredSpy);
    redlock.on('released', releasedSpy);

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');
    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    const lock = await redlock.acquireLock(resource, ttl);
    await redlock.releaseLock(resource, lock!.value);

    expect(acquiredSpy.calledOnce).to.be.true;
    expect(releasedSpy.calledOnce).to.be.true;
  });

  it('should use the "using" pattern', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');
    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    const result = await redlock.using(resource, ttl, async (lock) => {
      expect(lock.resource).to.equal(resource);
      return 'success';
    });

    expect(result).to.equal('success');
    // Verify release was called
    sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], sinon.match.any);
  });

  it('should auto-extend lock in "using" pattern', async () => {
    const resource = 'locks:test';
    const ttl = 100; // Short TTL for test
    const clock = sinon.useFakeTimers();

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');
    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    const renewSpy = sinon.spy(redlock, 'renewLock');

    const promise = redlock.using(resource, ttl, async () => {
      await clock.tickAsync(150); // Wait longer than TTL
      return 'done';
    }, { autoExtend: true });

    await promise;

    expect(renewSpy.called).to.be.true;
    clock.restore();
  });
});
