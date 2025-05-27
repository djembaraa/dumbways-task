import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "personal-web",
  password: "hayyun",
  port: 5432,
});

const connectDb = async () => {
  try {
    await pool.connect();
    console.log("Connected to PostgreSQL successfully!");
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
  }
};

export default pool;

// module.exports = {
//   pool,
//   connectDb,
// };
