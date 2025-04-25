const express = require('express');
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

app.post('/dynamic-carousel', (req, res) => {
    const data = req.body;

    if (!data || !data.airtableResponse) {
        return res.status(400).json({ error: 'The "airtableResponse" field is required in the request body.' });
    }

    try {
        // Check if airtableResponse is an object but not an array, and convert to array if needed
        let airtableResponse = data.airtableResponse;
        if (typeof airtableResponse === 'object' && !Array.isArray(airtableResponse)) {
            airtableResponse = Object.values(airtableResponse);
        }

        if (!Array.isArray(airtableResponse)) {
            return res.status(400).json({ error: 'airtableResponse must be an array or an object convertible to an array.' });
        }

        // Transform the Airtable response into carousel format
        const cards = airtableResponse.map((product) => {
            // Get description text and create a shortened version
            const description = product.Description || product.description || '';
            let shortDescription = description.split('\n')[0] || ''; // Get first line
            if (shortDescription.length > 50) {
                shortDescription = shortDescription.substring(0, 50) + '...';
            }
            shortDescription += ' (Read More)';
            
            // Create button type based on product link
            const productLink = product.productLink || '';
            const type = productLink.includes('variant=') ? 
                'visit-the-product-fcilnbdd' : 
                'visit-the-link-pdcjgcic';
            
            // Create card with exact format shown in example
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

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
