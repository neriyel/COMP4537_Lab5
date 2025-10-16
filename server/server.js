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

// Initialize database (end connection after setup)
async function initDB() {
    try {
        console.log("Attempting to connect to database...");
        const connection = await mysql.createConnection(dbConfig);
        console.log("Database connected successfully!");

        await connection.execute(`
          TRUNCATE TABLE patient;          
        `);
        console.log("Table 'patient' verified/created.");

        await connection.end();
        console.log("Database connection closed after initialization.");
    } catch (err) {
        console.error("Database initialization error:", err.message);
    }
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

    console.log(`Received ${req.method} request on ${path}`);

    if (path === "/query") {
        if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => (body += chunk));
            req.on("end", async () => {
                try {
                    const data = JSON.parse(body);
                    const sql = data.query.trim();
                    console.log("Received SQL (POST):", sql);

                    // Block dangerous SQL
                    if (/drop|update|delete|alter/i.test(sql)) {
                        console.warn("Forbidden SQL command attempted:", sql);
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Forbidden SQL command" }));
                        return;
                    }

                    const conn = await mysql.createConnection(dbConfig);
                    console.log("Connected to DB for POST query.");
                    const [result] = await conn.execute(sql);
                    await conn.end();
                    console.log("POST query executed successfully.");

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true, result }));
                } catch (err) {
                    console.error("❌ Error processing POST query:", err.message);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        } else if (req.method === "GET") {
            const sql = url.searchParams.get("query");
            console.log("Received SQL (GET):", sql);

            if (!sql || !/^select/i.test(sql)) {
                console.warn("Invalid or missing SELECT query.");
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Only SELECT allowed for GET" }));
                return;
            }

            try {
                const conn = await mysql.createConnection(dbConfig);
                console.log("Connected to DB for GET query.");
                const [rows] = await conn.query(sql);
                await conn.end();
                console.log("GET query executed successfully, rows returned:", rows.length);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(rows));
            } catch (err) {
                console.error("❌ Error processing GET query:", err.message);
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
