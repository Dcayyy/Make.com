/*
    This is the starting point for the app.
 */

// server.js
const http = require('http');
const app = require('./app');

const port = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Started on port ${port}`);
});
