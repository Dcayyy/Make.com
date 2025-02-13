const express = require('express');
const vm = require('vm');

const app = express();
app.use(express.json());

// Endpoint to execute arbitrary JS code
app.post('/execute', (req, res) => {
    // Expect the entire JS code to be passed in the "code" field of the JSON body
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    try {
        // Create a sandbox with no access to dangerous globals.
        // You can optionally expose safe utilities if needed.
        const sandbox = {};
        vm.createContext(sandbox);

        // Create the script instance with the provided code
        const script = new vm.Script(code);

        // Execute the code in the sandbox context.
        // The result will be whatever the last evaluated expression returns.
        const result = script.runInContext(sandbox, { timeout: 1000 });

        res.json({ result });
    } catch (error) {
        console.error('Error executing code:', error);
        res.status(500).json({ error: 'Error executing code', details: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
