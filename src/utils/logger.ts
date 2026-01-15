type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatMessage(level: LogLevel, message: string, meta?: object): string {
  const color = LOG_COLORS[level]
  const reset = LOG_COLORS.reset
  const timestamp = formatTimestamp()
  const levelStr = level.toUpperCase().padEnd(5)

  let output = `${color}[${timestamp}] ${levelStr}${reset} ${message}`

  if (meta && Object.keys(meta).length > 0) {
    output += ` ${JSON.stringify(meta)}`
  }

  return output
}

export const logger = {
  debug(message: string, meta?: object) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, meta))
    }
  },

  info(message: string, meta?: object) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, meta))
    }
  },

  warn(message: string, meta?: object) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta))
    }
  },

  error(message: string, error?: Error | object) {
    if (shouldLog('error')) {
      const meta = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error
      console.error(formatMessage('error', message, meta))
    }
  },

  // Request logging helper
  request(method: string, path: string, statusCode: number, duration: number, userId?: string) {
    const meta = {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...(userId && { userId }),
    }

    if (statusCode >= 500) {
      this.error('Request failed', meta)
    } else if (statusCode >= 400) {
      this.warn('Request error', meta)
    } else {
      this.info('Request completed', meta)
    }
  },
}

export default logger
