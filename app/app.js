const express = require('express');
const vm = require('vm');

const app = express();
app.use(express.json());

app.post('/execute', (req, res) => {
    let { code, data } = req.body;

    if (!code || !data) {
        return res.status(400).json({ error: 'Both "code" and "data" fields are required.' });
    }

    // Unwrap the double-stringified code
    try {
        if (typeof code === 'string' && code.startsWith('"') && code.endsWith('"')) {
            code = JSON.parse(code);
        }
    } catch (parseErr) {
        console.error('Error parsing code:', parseErr);
        return res.status(400).json({ error: 'Invalid code format' });
    }

    // Remove the invocation (e.g., transformAirtableResponse();) if present
    code = code.replace(/transformAirtableResponse\(\s*\);?$/, '');

    // Parse the data field (it is provided as a JSON string)
    let parsedData;
    try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (err) {
        console.error('Error parsing data field:', err);
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        // Create a sandbox and run the provided code to define the function
        const sandbox = { result: null };
        vm.createContext(sandbox);

        const script = new vm.Script(code);
        script.runInContext(sandbox, { timeout: 1000 });

        // Check that the function is defined
        if (typeof sandbox.transformAirtableResponse !== 'function') {
            return res.status(400).json({ error: 'Provided code did not define transformAirtableResponse function.' });
        }

        // Call the function with the parsed data
        sandbox.result = sandbox.transformAirtableResponse(parsedData);
        res.json({ result: sandbox.result });
    } catch (executionError) {
        console.error('Error executing code:', executionError);
        res.status(500).json({ error: 'Error executing code', details: executionError.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
