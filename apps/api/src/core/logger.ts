type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
};

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel =
  (process.env['LOG_LEVEL'] as LogLevel | undefined) ?? 'info';

const shouldLog = (level: LogLevel) =>
  LEVEL_RANK[level] >= LEVEL_RANK[minLevel];

const write = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
};

export const logger = {
  debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),

  /** Returns a child logger with fixed context fields merged into every entry. */
  child: (context: LogMeta) => ({
    debug: (message: string, meta?: LogMeta) =>
      write('debug', message, { ...context, ...meta }),
    info: (message: string, meta?: LogMeta) =>
      write('info', message, { ...context, ...meta }),
    warn: (message: string, meta?: LogMeta) =>
      write('warn', message, { ...context, ...meta }),
    error: (message: string, meta?: LogMeta) =>
      write('error', message, { ...context, ...meta }),
  }),
};

export type Logger = typeof logger;
