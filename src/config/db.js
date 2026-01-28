// @ts-check
import sql from "mssql";

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  pool: {
    min: 0,
    max: 15,
    idleTimeoutMillis: 40000,
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

/** @type {sql.ConnectionPool | null} */
let pool = null;

export const getConnection = async () => {
  try {
    if (pool) return pool;

    pool = await sql.connect(dbConfig);

    console.log("Conexión exitosa a la base de datos");

    return pool;
  } catch (error) {
    console.error("Error al obtener la conexión:", error);
    throw error;
  }
};

export { sql };
