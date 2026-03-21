import Business from "../models/businessModel.js";
import MenuItem from "../models/menuModel.js";
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import MenuCategory from "../models/menuCategoryModel.js";
import MenuSubcategory from "../models/menuSubcategoryModel.js";
import BusinessApplication from "../models/businessApplicationModel.js";


const generateKeywords = (text) => {
    const tokens = text.toLowerCase().split(" ");
    let keywords = [];
    for ( let i =0; i< tokens.length; i++) {
        let prefix = "";
        for (let j = 0; j <= i; j++) {
            prefix += tokens[j] + " ";
            keywords.push(prefix.trim());
        }
    }

    return Array.from(new Set(keywords));
};

//register a new business

const registerBusiness = async (req, res) => {
    try {
        const { name, category, address, location } = req.body;

        // Only approved business owners (admins) or superadmin can create a business account.
        if (!req.user || !["admin", "superadmin"].includes(req.user.role)) {
            return res.status(401).json({
                success: false,
                message : "Only business owners can create a business account"
            });
        }

        // If this is a business owner (admin), require an approved application first.
        let source = { name, category, address, location };
        if (req.user.role === "admin") {
          if (req.user.businessId) {
            return res.status(409).json({
              success: false,
              message: "Business already created for this account",
            });
          }

          const approvedApp = await BusinessApplication.findOne({
            applicantUserId: req.user._id,
            status: "approved",
            createdBusinessId: null,
          }).sort({ reviewedAt: -1, createdAt: -1 });

          if (!approvedApp) {
            return res.status(403).json({
              success: false,
              message: "No approved application found for this account",
            });
          }

          source = {
            name: approvedApp.businessName,
            category: approvedApp.category,
            address: approvedApp.address,
            location: approvedApp.location,
            applicationId: approvedApp._id,
          };
        }

        if (!source.name || !source.category || !source.address) {
          return res.status(400).json({
            success: false,
            message: "name, category, and address are required",
          });
        }

        const coordinates = source.location?.coordinates;
        if (
          !Array.isArray(coordinates) ||
          coordinates.length !== 2 ||
          !Number.isFinite(Number(coordinates[0])) ||
          !Number.isFinite(Number(coordinates[1]))
        ) {
          return res.status(400).json({
            success: false,
            message: "location.coordinates must be [lng, lat]",
          });
        }

        const searchString = `${source.name} ${source.category} ${source.address}`;
        const keywords = generateKeywords(searchString);

        const newBusiness = new Business({
            name: source.name,
            category: source.category,
            ownerId: req.user._id,
            address: source.address,
            searchkeywords: keywords,
            location : {
                type : "Point",
                coordinates : [Number(coordinates[0]), Number(coordinates[1])]
            }
        });

        const savedBusiness = await newBusiness.save();

        // Link the business to the owner account.
        const owner = await User.findById(req.user._id);
        if (owner) {
          owner.businessId = savedBusiness._id;
          await owner.save();
        }

        // Mark the approved application as used (if this was created via approval flow).
        if (source.applicationId) {
          await BusinessApplication.findByIdAndUpdate(source.applicationId, {
            createdBusinessId: savedBusiness._id,
          });
        }

        res.status(201).json({
            success: true,
            message: "Business account registered successfully",
            business: savedBusiness
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error registering business account"
        });
        
    }
}


//add menu into the business account

const addMenuItem = async (req, res) => {
    try {
        const { name, description, price, categoryId, subcategoryId, availability } = req.body;
        const { businessId } = req.params;

        const business = await Business.findById(businessId);

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found"
            });
        }

        // only business owners/admin can add menu items
        if (!req.user || !req.user._id.equals(business.ownerId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied to non business owners"
            });
        }

        if (!name || price == null || !categoryId) {
          return res.status(400).json({
            success: false,
            message: "name, price, and categoryId are required",
          });
        }

        const category = await MenuCategory.findOne({ _id: categoryId, businessId });
        if (!category) {
          return res.status(404).json({
            success: false,
            message: "Menu category not found for this business",
          });
        }

        let subcategory = null;
        if (subcategoryId) {
          subcategory = await MenuSubcategory.findOne({
            _id: subcategoryId,
            businessId,
            categoryId: category._id,
          });
          if (!subcategory) {
            return res.status(404).json({
              success: false,
              message: "Menu subcategory not found for this category/business",
            });
          }
        }
        
        const menuItem =  new MenuItem({
            businessId,
            name,
            menuType: category.menuType,
            categoryId: category._id,
            subcategoryId: subcategory ? subcategory._id : null,
            category: category.name, // legacy string field
            price: Number(price),
            description,
            availability: availability || "available",
        
        });

        const savedMenuItem = await menuItem.save();

        //add item reference to business
        business.menu.push(savedMenuItem._id);
        await business.save();

        res.status(201).json({
            success: true,
            message: "Menu item added successfully",
            menuItem: savedMenuItem,
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error adding menu item"
        });
        
    }
};

//add servivce to a business

const addService = async (req, res) => {
    try {
        const {name, price, description} = req.body;
        const { businessId } = req.params;

        const business = await Business.findById(businessId);

        if(!business) {
            return res.status(404).json({
                success : false,
                message : "Business not found"
            })
        }

        //only business owners/admin can add services
        if(!req.user || !req.user._id.equals(business.ownerId)) {
            return res.status(403).json({
                success : false,
                message : "Access denied to non business owners"
            });
        }

        const service = new Service({
            businessId,
            name,
            price,
            description
        })

        const savedService = await service.save();

        //add service reference to business
        business.services.push(savedService._id);
        await business.save();

        res.status(201).json({
            success : true,
            message : "Service added successfully",
            service : savedService,
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error adding service"
        });
    }
};

//get Business details (menu and services)

const getBusinessDetails = async (req, res) => {
    try {
        const { businessId } = req.params;

        // Only linked business admins/superadmin can view this business.
        const isSuper = req.user?.role === "superadmin";
        const isLinked = req.user?.businessId && String(req.user.businessId) === String(businessId);
        if (!isSuper && !isLinked) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const business = await Business.findById(businessId)
        .populate("menu", "name category price description")
        .populate("services", "name price description")
        .populate("Workers","name email role");

        if(!business) {
            return res.status(404).json({
                success : false,
                message : "Business not found"
            });
        }

        res.status(200).json({
            success : true,
            business,
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error fetching business details"
        })
    }
};

//assign workers to a business 

const assignWorkers = async (req, res) => {
    try {
        const { businessId } = req.params;
        const { workerId } = req.body;

        const business = await Business.findById(businessId);

        if(!business) {
            return res.status(404).json({
                success : false,
                message : " Business not found"
            })
        }

        //only business owners/admin can assign workers
        if(!req.user || !req.user._id.equals(business.ownerId)) {
            return res.status(403).json({
                success : false,
                message : "Access denied to non business owners"
            })
        }

        const worker = await User.findById(workerId);

        if(!worker) {
            return res.status(404).json({
                success : false,
                message : "Worker not found"
            })
        }

        business.Workers.push(worker._id);
        worker.businessId = business._id;
        await business.save();
        await worker.save();

        res.status(200).json({
            success : true,
            message : `Worker ${worker.name} assigned to business ${business.name}`,
            worker,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Error assigning worker to business"
        });
    }
};

export{
    registerBusiness,
    addMenuItem,
    addService,
    getBusinessDetails,
    assignWorkers
}
