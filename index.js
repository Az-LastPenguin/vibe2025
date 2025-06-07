const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');

const PORT  = 3000;

// Database connection settings
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'pass',
    database: 'todolist',
};


async function retrieveListItems() {
  try {
    // Create a connection to the database
    const connection = await mysql.createConnection(dbConfig);
    
    // Query to select all items from the database
    const query = 'SELECT id, text FROM items';
    
    // Execute the query
    const [rows] = await connection.execute(query);
    
    // Close the connection
    await connection.end();
    
    // Return the retrieved items as a JSON array
    return rows;
  } catch (error) {
    console.error('Error retrieving list items:', error);
    throw error; // Re-throw the error
  }
}

// Stub function for generating HTML rows
async function getHtmlRows() {
    // Example data - replace with actual DB data later
    /*
    const todoItems = [
        { id: 1, text: 'First todo item' },
        { id: 2, text: 'Second todo item' }
    ];*/

    const todoItems = await retrieveListItems();

    // Generate HTML for each item
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="edit-btn" data-id="${item.id}">Edit</button><button class="delete-btn" data-id="${item.id}">Delete</button></td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            
            // Replace template placeholder with actual content
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else if (parsedUrl.pathname === '/add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const { newItemText } = JSON.parse(body);
            try {
                const connection = await mysql.createConnection(dbConfig);
                await connection.execute(`INSERT INTO items (text) VALUES ('${newItemText}')`);
                await connection.end();
                res.writeHead(200);
                res.end('Item added');
            } catch (err) {
                console.error(err)
                res.writeHead(500);
                res.end('DB insert error');
            }
        });
    } else if (parsedUrl.pathname === '/delete' && req.method === 'DELETE') {
        const id = parsedUrl.query.id;
        try {
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute(`DELETE FROM items WHERE id = ${id}`);
            await connection.end();
            res.writeHead(200);
            res.end('Deleted');
        } catch (err) {
            res.writeHead(500);
            res.end('Delete error');
        }
    } else if (req.url === '/edit' && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const { id, newText } = JSON.parse(body);
            try {
                const connection = await mysql.createConnection(dbConfig);
                await connection.execute(`UPDATE items SET text = '${newText}' WHERE id = ${id}`);
                await connection.end();
                res.writeHead(200);
                res.end('Updated');
            } catch (err) {
                res.writeHead(500);
                res.end('Update error');
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

// Create Database if not present


// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
