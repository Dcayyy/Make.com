const fetch = require('node-fetch');

async function testExecuteJS() {
    // Example 1: Simple array manipulation
    const response1 = await fetch('http://localhost:3000/execute-js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: "result = data.map(x => x * 2);",
            data: [1, 2, 3, 4, 5]
        })
    });
    console.log('Test 1 Result:', await response1.json());

    // Example 2: Object transformation
    const response2 = await fetch('http://localhost:3000/execute-js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: "result = { ...data, processed: true, timestamp: new Date().toISOString() };",
            data: { name: "Test", value: 100 }
        })
    });
    console.log('Test 2 Result:', await response2.json());

    // Example 3: Complex calculation
    const response3 = await fetch('http://localhost:3000/execute-js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: `
                function factorial(n) {
                    return n <= 1 ? 1 : n * factorial(n - 1);
                }
                result = factorial(data);
            `,
            data: 5
        })
    });
    console.log('Test 3 Result:', await response3.json());
}

testExecuteJS().catch(console.error); 