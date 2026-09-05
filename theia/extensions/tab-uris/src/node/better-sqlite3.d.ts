/**
 * SQL-04 (12-02): minimal local typings for the `better-sqlite3` surface
 * this extension uses, so the reader compiles without a `@types/*`
 * dependency. Covers construction with the readonly flag, the readonly
 * property assert, prepared-statement point reads, and close only.
 */

declare module 'better-sqlite3' {
    interface BetterSqlite3Options {
        readonly?: boolean;
        fileMustExist?: boolean;
    }

    interface BetterSqlite3Statement {
        get(...params: unknown[]): unknown;
        all(...params: unknown[]): unknown[];
    }

    export default class BetterSqlite3Database {
        constructor(path: string, options?: BetterSqlite3Options);
        readonly readonly: boolean;
        prepare(sql: string): BetterSqlite3Statement;
        close(): void;
    }
}
