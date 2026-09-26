export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 502) { super(message); this.code = code; this.status = status; }
}
