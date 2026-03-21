import businessModel from "../models/businessModel.js";


// nearby businesses
const discoverNearbyBusinesses = async (req, res) => {
    try {
        const { lat, lng, category } = req.query;

        if(!lat || !lng) {
            return res.status(400).json({
                success : false,
                message : "user location is required"
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        const pipeline = [
            {
                $geoNear : {
                    near : {
                        type : "Point",
                        coordinates : [longitude, latitude]

                    },
                    distanceField : "distance",
                    spherical : true,
                    mixDistance : 50000
                }
            }
        ];

        if (category) {
            pipeline.push({
                $match : { category }
            });
        }

        pipeline.push({
            $project : {
                name : 1,
                address : 1,
                category : 1,
                rating : 1,
                location : 1,
                distance : 1
            }
        },
    {
        $limit : 100
    })

    const businesses = await businessModel.aggregate(pipeline);

    res.status(200).json({
        success : true,
        message : businesses.length,
        businesses
    })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error discovering nearby  businesses"
        })
    }
}

//map view discovery
const discoveryController = async (req, res) => {
    try {
        
        const { north, south, east, west } = req.query;

        if (!north || !south || !east || !west) {
            return res.status(400).json({
                success : false,
                message : "Map bounds are required"
            });
        }

        const query = {
            location: {
                $geoWithin: {
                    $box: [
                        [parseFloat(west), parseFloat(south)],
                        [parseFloat(east), parseFloat(north)]
                    ]
                }
            }
        };

        if(category) {
            query.category = category;
        }

        const businesses = await businessModel.find(query).limit(100);

        res.status(200).json({
            success : true,
            count : businesses.length,
            businesses
        });

    } catch (error) {

       console.log(error);
       res.status(500).json({
         success : false,
         message : "Error fetching businesses"
       })
        
    }
};

const searchBusinesses = async (req, res) => {
    try {
        
        const { query, lat, lng } = req.query;

        if(!query) {
            return res.status(400).json({
                success : false,
                message : "Search query is required"
            })
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        const pipeline = [
            {
                $geoNear : {
                    near : {
                        type : "Point",
                        coordinates : [longitude, latitude]
                    },
                    distanceField : "distance",
                    spherical : true,
                    mixDistance : 50000
                }
            },

            {
                $match : {
                    $text : { $search : query }
                }
            },
            {
                $project : {
                    name : 1,
                    category : 1,
                    address : 1,
                    location : 1,
                    distance : 1,
                    score : { $meta : "textScore" }
                }
            },
            {
                $sort : {
                    score : -1,
                    distance : 1
                }
            },
            {
                $limit : 100
            }
        ];

        const businesses = await businessModel.aggregate(pipeline);

        res.status(200).json({
            success : true,
            count : businesses.length,
            businesses
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error searching businesses"
        })
    }
};

const autocompleteBusiness = async (req, res) => {
    try {
        const { q, lat, lng } = req.query;

        if (!q) {
            return res.status(400).json({ success: false, message: "Query required" });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        const businesses = await Business.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitude, latitude] },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 50000 // 50 km
                }
            },
            {
                $match: { searchKeywords: { $regex: `^${q.toLowerCase()}`, $options: "i" } }
            },
            {
                $project: {
                    name: 1,
                    address: 1,
                    category: 1,
                    distance: 1
                }
            },
            { $sort: { distance: 1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            count: businesses.length,
            businesses
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Autocomplete error" });
    }
};

export  {discoveryController, discoverNearbyBusinesses, searchBusinesses, autocompleteBusiness};
