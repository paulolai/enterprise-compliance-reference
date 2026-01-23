import { Server } from 'node:http';
import { logger } from '../lib/logger';
import { close as closeDb } from '../../../../shared/src/index-server';

/**
 * Setup graceful shutdown handlers for the server.
 *
 * Ensures that the server stops accepting new connections, waits for
 * in-flight requests to complete, and closes database connections
 * before exiting.
 *
 * @param server The HTTP server instance to manage
 */
export const setupGracefulShutdown = (server: Server) => {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing server', err);
        process.exit(1);
      }

      logger.info('HTTP server closed, draining connections...');

      try {
        // 2. Close database connections
        await closeDb();
        logger.info('Database connections closed');

        // 3. Flush logs/metrics (if async)
        // ... any other cleanup ...

        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup', error);
        process.exit(1);
      }
    });

    // Force exit if cleanup takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000); // 10s timeout
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};
