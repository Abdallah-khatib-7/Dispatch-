import mysql, { type QueryValues, type ExecuteValues } from 'mysql2/promise';
import { env } from './env.ts';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  dateStrings: true,
});

export type Row = mysql.RowDataPacket;

// Values are genuinely dynamic; cast to mysql2's accepted values type at the
// boundary rather than leaking `any` into callers.
type Params = Record<string, unknown> | unknown[];

export const query = async <T extends Row>(sql: string, params?: Params): Promise<T[]> => {
  const [rows] = await pool.query<T[]>(sql, params as unknown as QueryValues);
  return rows;
};

export const execute = async (sql: string, params?: Params): Promise<mysql.ResultSetHeader> => {
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, params as unknown as ExecuteValues);
  return result;
};
