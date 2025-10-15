import http from "http";
import { URL } from "url";
import mysql from "mysql2/promise";

// Configure your MySQL credentials
const dbConfig = {
    host: process.env.DB_HOST || "your-host-name",
    user: process.env.DB_USER || "your-username",
    password: process.env.DB_PASS || "your-password",
    database: process.env.DB_NAME || "patients_db",
    port: process.env.DB_PORT || 25060
};

// Initialize database
async function initDB() {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(`
    CREATE TABLE IF NOT EXISTS patient (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(50),
      last_name VARCHAR(50),
      age INT,
      gender VARCHAR(10)
    ) ENGINE=InnoDB;
  `);
    await connection.end();
}
await initDB();

// Handle incoming requests
const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === "/query") {
        if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => (body += chunk));
            req.on("end", async () => {
                const data = JSON.parse(body);
                const sql = data.query.trim();

                // Block any dangerous SQL
                if (/drop|update|delete|alter/i.test(sql)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Forbidden SQL command" }));
                    return;
                }

                try {
                    const conn = await mysql.createConnection(dbConfig);
                    const [result] = await conn.execute(sql);
                    await conn.end();

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, result }));
                } catch (err) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        } else if (req.method === "GET") {
            const sql = url.searchParams.get("query");

            if (!sql || !/^select/i.test(sql)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Only SELECT allowed for GET" }));
                return;
            }

            try {
                const conn = await mysql.createConnection(dbConfig);
                const [rows] = await conn.query(sql);
                await conn.end();

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(rows));
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        } else {
            res.writeHead(405);
            res.end();
        }
    } else {
        res.writeHead(404);
        res.end("Not Found");
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
