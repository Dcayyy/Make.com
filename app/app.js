const express = require('express');
const { detectEmailProvider } = require('./emailProviderDetector');
const vm = require('vm');
const fetch = require('node-fetch');

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

app.post('/dynamic-carousel', (req, res) => {
    const data = req.body;
    let airtableResponse;

    if (Array.isArray(data)) {
        airtableResponse = data;
    } else if (data && data.airtableResponse) {
        airtableResponse = data.airtableResponse;
        if (typeof airtableResponse === 'object' && !Array.isArray(airtableResponse)) {
            airtableResponse = Object.values(airtableResponse);
        }
    } else {
        return res.status(400).json({ error: 'Request body must be an array or contain an "airtableResponse" field.' });
    }

    if (!Array.isArray(airtableResponse)) {
        return res.status(400).json({ error: 'Input must be an array or convertible to an array.' });
    }

    try {
        const cards = airtableResponse.map((product) => {
            const description = product.Description || product.description || '';
            let shortDescription = description.split('\n')[0] || '';
            if (shortDescription.length > 50) {
                shortDescription = shortDescription.substring(0, 50) + '...';
            }
            shortDescription += ' (Read More)';
            
            const productLink = product.productLink || '';
            const type = productLink.includes('variant=') ? 
                'visit-the-product-fcilnbdd' : 
                'visit-the-link-pdcjgcic';
            
            return {
                id: product.id || String(product.__IMTINDEX__ || ''),
                title: `${(product.productName || '').toUpperCase()} | $${product.price}`,
                description: {
                    slate: [
                        {
                            children: [
                                {
                                    text: description
                                }
                            ]
                        }
                    ],
                    text: shortDescription
                },
                imageUrl: product.productImageUrl || '',
                buttons: [
                    {
                        name: type.includes('product') ? "Visit the product" : "Visit the link",
                        request: {
                            type: type,
                            payload: {
                                label: type.includes('product') ? "Visit the product" : "Visit the link",
                                actions: [
                                    {
                                        type: "open_url",
                                        payload: {
                                            url: productLink
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            };
        });

        const result = {
            layout: "Carousel",
            cards: cards
        };

        res.json(result);
    } catch (error) {
        console.error('Error transforming airtable response:', error);
        res.status(500).json({ error: 'Error transforming airtable response', details: error.message });
    }
});

app.post('/execute-js', async (req, res) => {
    const { code, data } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'The "code" field is required in the request body.' });
    }

    try {
        const sandbox = {
            data: data || {},
            fetch: fetch,
            result: null
        };

        vm.createContext(sandbox);

        const wrappedCode = `
            (async () => {
                ${code}
            })();
        `;

        const script = new vm.Script(wrappedCode);
        await script.runInContext(sandbox, { timeout: 5000 });

        res.json({ 
            result: sandbox.result,
            success: true
        });
    } catch (error) {
        console.error('Error executing JavaScript code:', error);
        res.status(500).json({ 
            error: 'Error executing JavaScript code', 
            details: error.message,
            success: false
        });
    }
});

const startServer = async () => {
    try {
        await app.listen(3000);
        console.log('Server running on port 3000');
    } catch (error) {
        console.error('Error starting server:', error);
    }
};

startServer();
