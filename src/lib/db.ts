import mysql from "mysql2/promise";

declare global {
  var __pool: mysql.Pool | undefined;
}

export function getPool() {
  if (!global.__pool) {
    global.__pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "lead_autopilot",
      connectionLimit: 10,
      waitForConnections: true,
    });
  }
  return global.__pool;
}
