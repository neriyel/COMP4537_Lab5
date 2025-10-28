const serverUrl = "https://comp4537-lab5-2v5u4.ondigitalocean.app/query"; // your Node.js server address

      const insertBtn = document.getElementById("insertBtn");
      const submitBtn = document.getElementById("submitQuery");
      const queryInput = document.getElementById("queryInput");
      const responseDiv = document.getElementById("response");

      // Default rows to insert
      const defaultInsertQuery = `
      INSERT INTO patient (first_name, last_name, dob)
      VALUES
      ('Sara', 'Brown', '1901-01-01'),
      ('John', 'Smith', '1941-01-01'),
      ('Jack', 'Ma', '1961-01-30'),
      ('Elon', 'Musk', '1999-01-01');
    `;

      // Handle insert button click
      insertBtn.addEventListener("click", async () => {
        try {
          const res = await fetch(serverUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: defaultInsertQuery }),
          });
          const data = await res.json();
          responseDiv.textContent = JSON.stringify(data, null, 2);
        } catch (err) {
          responseDiv.textContent = "Error: " + err.message;
        }
      });

      // Handle submit query button
      submitBtn.addEventListener("click", async () => {
        const query = queryInput.value.trim();
        if (!query) {
          alert("Please enter a SQL query first.");
          return;
        }

        try {
          let res, data;

          if (/^select/i.test(query)) {
            // For SELECT: send via GET
            const encoded = encodeURIComponent(query);
            res = await fetch(`${serverUrl}?query=${encoded}`);
          } else if (/^insert/i.test(query)) {
            // For INSERT: send via POST
            res = await fetch(serverUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query }),
            });
          } else {
            alert("Only SELECT or INSERT queries are allowed!");
            return;
          }

          data = await res.json();
          responseDiv.textContent = JSON.stringify(data, null, 2);
        } catch (err) {
          responseDiv.textContent = "Error: " + err.message;
        }
      });