import { logger } from "../logger";


export class Semaphore
{

  readonly sharedArrayBuffer: SharedArrayBuffer;

  readonly int32Array: Int32Array;

  static prepare(): SharedArrayBuffer
  {
    return new SharedArrayBuffer(4);
  }

  constructor(sharedArrayBuffer: SharedArrayBuffer)
  {
    this.sharedArrayBuffer = sharedArrayBuffer;
    this.int32Array = new Int32Array(this.sharedArrayBuffer);
  }

  async run<T>(callback: () => Promise<T>): Promise<T>
  {
    const index = 0;
    const isWorking = Atomics.load(this.int32Array, index);
    const isIdleValue = 0;
    const isWorkingValue = 1;
    if (isWorking !== isIdleValue)
    {
      logger.debug("Waiting for the semaphore to be ready");
      Atomics.wait(this.int32Array, index, isWorkingValue, Infinity);
    }
    Atomics.store(this.int32Array, index, isWorkingValue);
    logger.debug("Running the semaphore routine");
    const value = await callback();
    Atomics.store(this.int32Array, index, isIdleValue);
    logger.debug("Waking up the semaphore");
    Atomics.notify(this.int32Array, index, isWorkingValue);
    return value;
  }

}
