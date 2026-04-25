#!/usr/bin/env bun
import { Command } from "commander";
import { initDatabase } from "./lib/db/init.ts";
import { getDb } from "./lib/db/client.ts";

export const program = new Command("db")
  .description("SQLite 数据库管理")
  .showHelpAfterError();

program
  .command("init")
  .description("初始化数据库 schema")
  .action(() => {
    initDatabase();
  });

program
  .command("query")
  .description("执行 SQL 查询")
  .argument("<sql>", "SQL 查询语句")
  .action((sql: string) => {
    const rows = getDb().prepare(sql).all();
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
  });
