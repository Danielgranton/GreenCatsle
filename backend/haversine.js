const COMPANY_COORDS = {
    lat : -1.28333, 
    lng : 36.81667
};

const cityCoordinates = {
       'nairobi|nairobi': { lat: -1.28333, lng: 36.81667 },
    'westlands|nairobi': { lat: -1.2666, lng: 36.8065 },
    'kilimani|nairobi': { lat: -1.287, lng: 36.797 },
    'thika|kiambu': { lat: -1.0369, lng: 37.0794 },
    'machakos|machakos': { lat: -1.5123, lng: 37.2634 },
    'kajiado|kajiado': { lat: -1.8539, lng: 36.7736 },

    // --- MORE LOCATIONS ADDED BELOW ---

    // Kiambu County
    'ruiru|kiambu': { lat: -1.1500, lng: 36.9600 },
    'juja|kiambu': { lat: -1.1817, lng: 37.0144 },
    'githunguri|kiambu': { lat: -1.0400, lng: 36.8300 },
    'limuru|kiambu': { lat: -1.1136, lng: 36.6422 },

    // Nairobi Estates
    'umojai|nairobi': { lat: -1.2843, lng: 36.8824 },
    'embakasi|nairobi': { lat: -1.3233, lng: 36.9339 },
    'southb|nairobi': { lat: -1.3065, lng: 36.8348 },
    'rongai|kajiado': { lat: -1.3961, lng: 36.7643 },

    // Machakos region
    'syokimau|machakos': { lat: -1.3600, lng: 36.9500 },
    'mlolongo|machakos': { lat: -1.3900, lng: 36.9300 },
    'athi river|machakos': { lat: -1.4500, lng: 36.9800 },

    // Mombasa County
    'mombasa|mombasa': { lat: -4.0435, lng: 39.6682 },
    'likoni|mombasa': { lat: -4.0910, lng: 39.6820 },
    'nyali|mombasa': { lat: -4.0150, lng: 39.7200 },
    'kisauni|mombasa': { lat: -4.0140, lng: 39.7004 },

    // Kisumu County
    'kisumu|kisumu': { lat: -0.0917, lng: 34.7680 },
    'maseno|kisumu': { lat: -0.0033, lng: 34.5958 },
    'muhoroni|kisumu': { lat: -0.1541, lng: 35.1967 },

    // Nakuru County
    'nakuru|nakuru': { lat: -0.3031, lng: 36.0800 },
    'naivasha|nakuru': { lat: -0.7167, lng: 36.4333 },
    'gilgil|nakuru': { lat: -0.4870, lng: 36.3111 },

    // Uasin Gishu
    'eldoret|uasin gishu': { lat: 0.5143, lng: 35.2698 },
    'zambezi|uasin gishu': { lat: 0.5200, lng: 35.3000 },

    // Meru County
    'meru|meru': { lat: 0.0473, lng: 37.6559 },
    'timau|meru': { lat: 0.0833, lng: 37.2900 },

    // Nyeri County
    'nyeri|nyeri': { lat: -0.4167, lng: 36.9500 },
    'karatina|nyeri': { lat: -0.4833, lng: 37.1333 },

    // Kakamega County
    'kakamega|kakamega': { lat: 0.2819, lng: 34.7519 },
    'malava|kakamega': { lat: 0.3350, lng: 34.8498 },

    // Garissa County
    'garissa|garissa': { lat: -0.4531, lng: 39.6460 },
    'dagahaley|garissa': { lat: 0.0333, lng: 40.3167 },

    // Turkana County
    'lodwar|turkana': { lat: 3.1219, lng: 35.5964 },

    // Lamu County
    'lamu|lamu': { lat: -2.2716, lng: 40.9020 }
};

function deg2rad(deg) {
    return deg * (Math.PI /180);
}

function haversineDistance(a, b){
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(b.lat - a.lat);
    const dLon = deg2rad(b.lng - a.lng);
    const lat1 = deg2rad(a.lat);
    const lat2 = deg2rad(b.lat);

    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const aHar = sinDlat * sinDlat + sinDlon * sinDlon * Math.cos(lat1) * Math.cos(lat2);

    // FIXED: sqrt not aqrt
    const c = 2 * Math.atan2(Math.sqrt(aHar), Math.sqrt(1 - aHar));

    return R * c;
}

function getCoordsFor(city, county) {
    const key = `${city.trim().toLowerCase()}|${county.trim().toLowerCase()}`;
    return cityCoordinates[key] || null;
}

export function calculateDeliveryFee ({country, county, city, email}) {
    if (!country || !county || !city || !email) {
        throw new Error("All fields are required to calculate delivery fee");
    }

    if (country.trim().toLowerCase() !== "kenya") {
        return { supported: false,fee: null, message : "Only deliveries within Kenya at the moment"};
    }

    const coords = getCoordsFor(city, county);

    if (!coords) {
        return {
            supported: true,
            fee: 800,
            currency: 'KES',
            tier: 'Fallback: unknown city',
        };
    }

    const distKm = haversineDistance(COMPANY_COORDS, coords);

    let fee, tier;

    if (distKm <= 5) {
        fee = 100;
        tier = "0-5 km (Nairobi CBD & nearby)";
    } else if (distKm <= 20) {
        fee = 200;
        tier = "5-20 km";
    } else if (distKm <= 50) {
        fee = 400;
        tier = "20-50 km";
    } else {
        fee = 800;
        tier = ">50 km";
    }

    return {
        supported: true,
        fee,
        currency: "KES",
        tier,
        distanceKm: Number(distKm.toFixed(2))
    };
}
