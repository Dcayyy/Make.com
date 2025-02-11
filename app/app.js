// app.js
const express = require('express');
const { transformAirtableResponse } = require('./DynamicCarousel'); // Import the function

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Define the POST route that calls transformAirtableResponse with the request body
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

// Retrieve the port from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
