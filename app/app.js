const express = require('express');
const vm = require('vm');
const { detectEmailProvider } = require('./emailProviderDetector');

const app = express();
app.use(express.json());

app.post('/email-host-lookup', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email field is required.' });
    }
    
    try {
        const result = await detectEmailProvider(email);
        res.json(result);
    } catch (error) {
        console.error('Error detecting email provider:', error);
        res.status(500).json({ 
            error: 'Error detecting email provider',
            details: error.message
        });
    }
});

app.post('/execute', (req, res) => {
    let { code, data } = req.body;

    if (!code || !data) {
        return res.status(400).json({ error: 'Both "code" and "data" fields are required.' });
    }

    try {
        if (typeof code === 'string' && code.startsWith('"') && code.endsWith('"')) {
            code = JSON.parse(code);
        }
    } catch (parseErr) {
        console.error('Error parsing code:', parseErr);
        return res.status(400).json({ error: 'Invalid code format' });
    }

    code = code.replace(/transformAirtableResponse\(\s*\);?$/, '');

    let parsedData;
    try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (err) {
        console.error('Error parsing data field:', err);
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        const sandbox = { result: null };
        vm.createContext(sandbox);

        const script = new vm.Script(code);
        script.runInContext(sandbox, { timeout: 1000 });

        if (typeof sandbox.transformAirtableResponse !== 'function') {
            return res.status(400).json({ error: 'Provided code did not define transformAirtableResponse function.' });
        }

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
