export class Mutex {
  private queue: Promise<unknown>;

  constructor() {
    this.queue = Promise.resolve();
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => task());
    this.queue = result.catch(() => {});
    return result;
  }
}
