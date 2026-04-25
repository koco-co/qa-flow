import type { DriverType } from "../direct/types";

export interface EnvironmentConfig {
  readonly baseUrl: string;
  readonly login?: { readonly username: string; readonly password: string };
  readonly tenant?: string;
}

export interface DatasourceConfig {
  readonly type: DriverType;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database?: string;
}

export interface DtStackCliConfig {
  readonly defaultEnv?: string;
  readonly environments: Record<string, EnvironmentConfig>;
  readonly datasources: Record<string, DatasourceConfig>;
}
