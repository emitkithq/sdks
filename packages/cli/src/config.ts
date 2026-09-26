import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** What `emitkit login` saves. */
export interface Config {
  readonly apiKey?: string;
  readonly apiUrl?: string;
}

/** `$EMITKIT_CONFIG_DIR`, or `$XDG_CONFIG_HOME/emitkit`, or `~/.config/emitkit`. */
export const configDir = () =>
  process.env.EMITKIT_CONFIG_DIR ??
  join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "emitkit");

const configFile = () => join(configDir(), "config.json");

export const loadConfig = async (): Promise<Config> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(configFile(), "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const { apiKey, apiUrl } = parsed as Record<string, unknown>;
    return {
      ...(typeof apiKey === "string" ? { apiKey } : {}),
      ...(typeof apiUrl === "string" ? { apiUrl } : {}),
    };
  } catch {
    return {};
  }
};

/** Readable by you only: the file holds an API key. */
export const saveConfig = async (config: Config) => {
  await mkdir(configDir(), { mode: 0o700, recursive: true });
  await writeFile(configFile(), `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  await chmod(configFile(), 0o600);
  return configFile();
};

export const removeConfig = () => rm(configFile(), { force: true });

/** The first characters of a key: enough to recognize it, never the secret. */
export const keyPrefix = (key: string) => `${key.slice(0, 12)}…`;
