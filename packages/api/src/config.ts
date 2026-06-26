/** Runtime configuration, sourced from environment with sane local defaults. */
export interface Config {
  port: number;
  host: string;
  dbFile: string;
  nodeEnv: 'development' | 'test' | 'production';
  prettyLogs: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv = (env.NODE_ENV as Config['nodeEnv']) ?? 'development';
  return {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '0.0.0.0',
    dbFile: env.DB_FILE ?? 'wordle.sqlite',
    nodeEnv,
    prettyLogs: nodeEnv !== 'production',
  };
}
