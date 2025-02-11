// app.js
const express = require('express');
const { transformAirtableResponse } = require('./Dynamic Carousel'); // Import your helper function

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Define the dynamic carousel endpoint
app.post('/dynamic-carousel', (req, res) => {
    try {
        // Expecting the request body to have an 'airtableResponse' field
        const inputData = req.body;
        const transformedData = transformAirtableResponse(inputData);
        res.json(transformedData);
    } catch (error) {
        console.error('Error transforming Airtable response:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// You can add additional routes here if needed

module.exports = app;
