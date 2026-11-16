import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

class MockPhaserEventEmitter {
  private readonly ee = new EventEmitter();

  on(event: string | symbol, fn: (...args: unknown[]) => void, context?: unknown): this {
    const listener = context !== undefined ? fn.bind(context) : fn;
    this.ee.on(event, listener);
    return this;
  }

  once(event: string | symbol, fn: (...args: unknown[]) => void, context?: unknown): this {
    const listener = context !== undefined ? fn.bind(context) : fn;
    this.ee.once(event, listener);
    return this;
  }

  off(event: string | symbol, fn?: (...args: unknown[]) => void): this {
    if (fn) this.ee.off(event, fn);
    else this.ee.removeAllListeners(event);
    return this;
  }

  emit(event: string | symbol, ...args: unknown[]): boolean {
    return this.ee.emit(event, ...args);
  }

  removeAllListeners(event?: string | symbol): this {
    this.ee.removeAllListeners(event);
    return this;
  }
}

vi.mock('phaser', () => ({
  default: {
    Events: { EventEmitter: MockPhaserEventEmitter },
    Scenes: { Events: { UPDATE: 'update', SHUTDOWN: 'shutdown' } },
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
    },
    BlendModes: { NORMAL: 0, ERASE: 17 },
  },
}));
