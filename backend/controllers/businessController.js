import Business from "../models/businessModel.js";
import MenuItem from "../models/menuModel.js";
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import MenuCategory from "../models/menuCategoryModel.js";
import MenuSubcategory from "../models/menuSubcategoryModel.js";
import BusinessApplication from "../models/businessApplicationModel.js";
import { getSignedGetUrl } from "../services/storageService.js";

const absolutizeLocalUrl = ({ req, url }) => {
  if (typeof url !== "string" || !url.startsWith("/images/")) return url;
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${url}`;
};

const getLogoUrl = async ({ req, business }) => {
  const key = business?.logo?.key;
  if (!key) return null;
  const provider = business?.logo?.provider;
  const url = await getSignedGetUrl({ key, provider, expiresInSeconds: 600 });
  return absolutizeLocalUrl({ req, url });
};

const getImageUrl = async ({ req, key, provider, expiresInSeconds = 600 }) => {
  if (!key) return null;
  const url = await getSignedGetUrl({ key, provider, expiresInSeconds });
  return absolutizeLocalUrl({ req, url });
};

export const listBusinessesPublic = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 100)));
    const businesses = await Business.find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("name category address location rating logo");

    const out = await Promise.all(
      businesses.map(async (b) => ({
        _id: b._id,
        name: b.name,
        category: b.category,
        address: b.address,
        rating: b.rating,
        location: b.location,
        logoUrl: await getLogoUrl({ req, business: b }),
      }))
    );

    res.status(200).json({ success: true, businesses: out });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list businesses" });
  }
};

export const getBusinessPublicDetails = async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!businessId) {
      return res.status(400).json({ success: false, message: "businessId is required" });
    }
    const business = await Business.findById(businessId).select("name category address location status rating logo");
    if (!business || business.status !== "active") {
      return res.status(404).json({ success: false, message: "Business not found" });
    }
    const logoUrl = await getLogoUrl({ req, business });
    res.status(200).json({
      success: true,
      business: {
        id: String(business._id),
        name: business.name,
        category: business.category,
        address: business.address,
        rating: business.rating,
        location: business.location,
        logoUrl,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load business details" });
  }
};

export const getBusinessMenuPublic = async (req, res) => {
  try {
    const { businessId } = req.params;
    const includeUnavailable = String(req.query?.includeUnavailable || "") === "1";

    const business = await Business.findById(businessId).select("name category address location status logo");
    if (!business || business.status !== "active") {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    const categories = await MenuCategory.find({ businessId, isActive: true }).sort({ sortOrder: 1, name: 1 });
    const itemFilter = { businessId };
    if (!includeUnavailable) itemFilter.availability = "available";
    const items = await MenuItem.find(itemFilter).sort({ name: 1 });

    const itemsByCategory = new Map();
    for (const item of items) {
      if (!item.categoryId) continue;
      const key = String(item.categoryId);
      const arr = itemsByCategory.get(key) || [];
      arr.push(item);
      itemsByCategory.set(key, arr);
    }

    const cooked = [];
    const noncooked = [];

    for (const cat of categories) {
      const catId = String(cat._id);
      const catItems = itemsByCategory.get(catId) || [];
      const node = {
        category: {
          id: catId,
          name: cat.name,
          menuType: cat.menuType,
          imageUrl: await getImageUrl({ req, key: cat.image?.key, provider: cat.image?.provider }),
        },
        items: await Promise.all(
          catItems.map(async (it) => ({
            id: String(it._id),
            name: it.name,
            description: it.description || "",
            price: Number(it.price || 0),
            availability: it.availability,
            imageUrl: await getImageUrl({ req, key: it.image?.key, provider: it.image?.provider }),
          }))
        ),
      };
      if (cat.menuType === "cooked") cooked.push(node);
      else noncooked.push(node);
    }

    res.status(200).json({
      success: true,
      business: {
        id: String(business._id),
        name: business.name,
        category: business.category,
        address: business.address,
        location: business.location,
        logoUrl: await getLogoUrl({ req, business }),
      },
      menu: { cooked, noncooked },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch menu" });
  }
};

export const listMenuCategoriesPublic = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 50)));

    const agg = await MenuCategory.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "businesses",
          localField: "businessId",
          foreignField: "_id",
          as: "biz",
        },
      },
      { $unwind: "$biz" },
      { $match: { "biz.status": "active" } },
      {
        $group: {
          _id: { menuType: "$menuType", nameLower: { $toLower: "$name" } },
          menuType: { $first: "$menuType" },
          name: { $first: "$name" },
          businesses: { $addToSet: "$businessId" },
          occurrences: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          menuType: 1,
          name: 1,
          businessCount: { $size: "$businesses" },
          occurrences: 1,
        },
      },
      { $sort: { businessCount: -1, name: 1 } },
      { $limit: limit * 2 },
    ]);

    const cooked = [];
    const noncooked = [];
    for (const row of agg) {
      if (row.menuType === "cooked") cooked.push(row);
      else if (row.menuType === "noncooked") noncooked.push(row);
    }

    res.status(200).json({ success: true, cooked: cooked.slice(0, limit), noncooked: noncooked.slice(0, limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list menu categories" });
  }
};

export const listMenuCategoryCardsPublic = async (req, res) => {
  try {
    const businessCategory = typeof req.query?.businessCategory === "string" ? req.query.businessCategory : "";
    const menuType = typeof req.query?.menuType === "string" ? req.query.menuType : "";
    const limitBusinesses = Math.min(200, Math.max(1, Number(req.query?.limitBusinesses || 100)));
    const limitCards = Math.min(500, Math.max(1, Number(req.query?.limit || 200)));

    const businessFilter = { status: "active" };
    if (businessCategory) businessFilter.category = businessCategory;

    const businesses = await Business.find(businessFilter)
      .sort({ createdAt: -1 })
      .limit(limitBusinesses)
      .select("name category address logo");

    const businessIds = businesses.map((b) => b._id);
    const bizMap = new Map(businesses.map((b) => [String(b._id), b]));

    const catFilter = { businessId: { $in: businessIds }, isActive: true };
    if (menuType && ["cooked", "noncooked"].includes(menuType)) catFilter.menuType = menuType;

    const categories = await MenuCategory.find(catFilter).sort({ sortOrder: 1, name: 1 }).limit(limitCards);

    const cards = await Promise.all(
      categories.map(async (c) => {
        const biz = bizMap.get(String(c.businessId)) || null;
        const businessLogoUrl = biz ? await getLogoUrl({ req, business: biz }) : null;
        const categoryImageUrl = await getImageUrl({ req, key: c.image?.key, provider: c.image?.provider });
        return {
          id: String(c._id),
          menuType: c.menuType,
          categoryName: c.name,
          categoryImageUrl,
          business: biz
            ? {
                id: String(biz._id),
                name: biz.name,
                category: biz.category,
                address: biz.address,
                logoUrl: businessLogoUrl,
              }
            : null,
        };
      })
    );

    res.status(200).json({ success: true, cards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list menu category cards" });
  }
};

export const listMenuItemCardsPublic = async (req, res) => {
  try {
    const businessCategory = typeof req.query?.businessCategory === "string" ? req.query.businessCategory : "";
    const menuType = typeof req.query?.menuType === "string" ? req.query.menuType : "";
    const businessId = typeof req.query?.businessId === "string" ? req.query.businessId : "";
    const categoryId = typeof req.query?.categoryId === "string" ? req.query.categoryId : "";
    const limitBusinesses = Math.min(200, Math.max(1, Number(req.query?.limitBusinesses || 100)));
    const limit = Math.min(500, Math.max(1, Number(req.query?.limit || 200)));

    const businessFilter = { status: "active" };
    if (businessCategory) businessFilter.category = businessCategory;
    if (businessId) businessFilter._id = businessId;

    const businesses = await Business.find(businessFilter)
      .sort({ createdAt: -1 })
      .limit(limitBusinesses)
      .select("name category address logo");

    const businessIds = businesses.map((b) => b._id);
    const bizMap = new Map(businesses.map((b) => [String(b._id), b]));

    if (businessIds.length === 0) return res.status(200).json({ success: true, items: [] });

    const catFilter = { businessId: { $in: businessIds }, isActive: true };
    if (menuType && ["cooked", "noncooked"].includes(menuType)) catFilter.menuType = menuType;
    if (categoryId) catFilter._id = categoryId;

    const categories = await MenuCategory.find(catFilter).select("name menuType image businessId").limit(1000);
    const categoryIds = categories.map((c) => c._id);
    const catMap = new Map(categories.map((c) => [String(c._id), c]));

    if (categoryIds.length === 0) return res.status(200).json({ success: true, items: [] });

    const itemFilter = {
      businessId: { $in: businessIds },
      categoryId: { $in: categoryIds },
      availability: "available",
    };
    const menuItems = await MenuItem.find(itemFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("businessId categoryId name description price availability image menuType");

    const items = await Promise.all(
      menuItems.map(async (it) => {
        const biz = bizMap.get(String(it.businessId)) || null;
        const cat = it.categoryId ? catMap.get(String(it.categoryId)) || null : null;
        const businessLogoUrl = biz ? await getLogoUrl({ req, business: biz }) : null;
        const imageUrl = await getImageUrl({ req, key: it.image?.key, provider: it.image?.provider });
        return {
          id: String(it._id),
          name: it.name || "",
          description: it.description || "",
          price: Number(it.price || 0),
          availability: it.availability,
          imageUrl,
          menuType: it.menuType || cat?.menuType || null,
          category: cat
            ? {
                id: String(cat._id),
                name: cat.name,
                imageUrl: await getImageUrl({ req, key: cat.image?.key, provider: cat.image?.provider }),
              }
            : null,
          business: biz
            ? {
                id: String(biz._id),
                name: biz.name,
                category: biz.category,
                address: biz.address,
                logoUrl: businessLogoUrl,
              }
            : null,
        };
      })
    );

    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to list menu items" });
  }
};

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
