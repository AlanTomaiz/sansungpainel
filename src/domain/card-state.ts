export type CardState<T> =
  | { status: 'ok'; data: T; updatedAt: number }
  | { status: 'stale'; data: T; updatedAt: number; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'loading' };

export class RelayUnreachableError extends Error {
  constructor() {
    super('relay unreachable');
    this.name = 'RelayUnreachableError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super('network failure');
    this.name = 'NetworkError';
  }
}

export class ReasonError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'ReasonError';
  }
}
