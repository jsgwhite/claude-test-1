/**
 * Production entrypoint: the single place where concrete implementations are
 * wired. Swapping the database = change the repository construction here only.
 */
import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { buildWordList, loadSystemWords } from './domain/wordlist.js';
import { createDrizzleClient } from './repositories/drizzle/client.js';
import { DrizzleGameRepository } from './repositories/drizzle/DrizzleGameRepository.js';
import { DrizzleStatsRepository } from './repositories/drizzle/DrizzleStatsRepository.js';

async function main() {
  const config = loadConfig();
  const db = createDrizzleClient(config.dbFile);
  const systemWords = loadSystemWords();

  const app = await buildServer({
    deps: {
      gameRepo: new DrizzleGameRepository(db),
      statsRepo: new DrizzleStatsRepository(db),
      wordList: buildWordList({ systemWords }),
    },
    logger: config.prettyLogs
      ? { transport: { target: 'pino-pretty' } }
      : true,
  });

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
