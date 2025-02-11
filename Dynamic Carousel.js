function transformAirtableResponse(data) {
    const cards = data.airtableResponse.map((product, index) => {
        const productLinkParts = product.productLink.split('/');
        const lastSegment = productLinkParts[productLinkParts.length - 1];
        const productId = lastSegment.startsWith('p_') ? lastSegment.substring(2) : lastSegment;

        return {
            id: String(index + 1),
            title: `${product.productName} | £${product.price}`,
            description: {
                slate: [
                    {
                        children: [
                            {
                                text: product.description,
                                italic: true
                            }
                        ]
                    }
                ],
                text: product.description
            },
            imageUrl: product.productImageUrl,
            buttons: [
                {
                    name: "View Product",
                    request: {
                        type: `view-product-${productId}`,
                        payload: {
                            label: "View Product",
                            actions: [
                                {
                                    type: "open_url",
                                    payload: {
                                        url: product.productLink
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        };
    });

    return {
        layout: "Carousel",
        cards: cards
    };
}


const airtableResponse = {
    "airtableResponse": [
        {
            "price": 27.51,
            "category": "Fat Burner",
            "createdTime": "2025-02-10T20:12:28.000Z",
            "description": "Support your body round the clock with our 24-hour Smart Pack – including an A-Z multivitamin tablet, green tea capsule, 24hr Fatburn (morning and evening capsule) and our Omega 3 softgel.",
            "productLink": "https://www.bodyandfit.com/en-gb/Products/Weight-Loss/Diet-Foods/Green-Tea-Extract/24HR-Smart-Pack/p/p_11157",
            "productName": "24HR Smart Pack",
            "discountedPrice": 27.51,
            "productImageUrl": "https://media.bodyandfit.com/i/bodyandfit/11157_Image_01?$TTL_PRODUCT_IMAGES$&locale=en-gb,*&w=509&sm=aspect&aspect=1:1&fmt=webp"
        },
        {
            "price": 25.49,
            "category": "Fat Burner",
            "createdTime": "2025-02-10T20:27:44.000Z",
            "description": "We’ve created the perfect tablet for anyone with body composition goals or following a weight loss diet. ",
            "productLink": "https://www.bodyandfit.com/en-gb/Products/Weight-Loss/Diet-Foods/Green-Coffee/Perfect-Burn/p/p_03840",
            "productName": "Perfect Burn",
            "discountedPrice": 21.67,
            "productImageUrl": "https://media.bodyandfit.com/i/bodyandfit/03840_Image_01?$TTL_PRODUCT_IMAGES$&locale=en-gb,*&w=509&sm=aspect&aspect=1:1&fmt=webp"
        },
        {
            "price": 48.99,
            "category": "Fat Burner",
            "createdTime": "2025-02-10T20:27:12.000Z",
            "description": "The iconic Animal Cuts from Universal is the perfect choice for anyone serious about their body composition goals or weight loss diet.",
            "productLink": "https://www.bodyandfit.com/en-gb/Products/Weight-Loss/Diet-Supplements/Fat-Burners/Animal-Cuts/p/p_01251",
            "productName": "Animal Cuts",
            "discountedPrice": 48.99,
            "productImageUrl": "https://media.bodyandfit.com/i/bodyandfit/01251_Image_01?$TTL_PRODUCT_IMAGES$&locale=en-gb,*&w=509&sm=aspect&aspect=1:1&fmt=webp"
        }
    ]
};

const carouselJSON = transformAirtableResponse(airtableResponse);
console.log(JSON.stringify(carouselJSON, null, 2));