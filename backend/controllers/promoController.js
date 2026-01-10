import promoModel from "../models/promoModel.js";
import orderModel from "../models/orderModel.js";

//apply promo code
const applyPromo = async (req, res) => {

    const {code, userId, orderId} = req.body;

    try {
        // validate input
        if (!code || !code.trim()) {
            return res.json({ success : false , message : "Promo Code is required" });
        }
        
        // check if promo exists and is valid
        const promo = await promoModel.findOne({ code: code.trim().toUpperCase() });

        if( !promo || !promo.isActive || promo.expiresAt < new Date()) {
            return res.json({ success : false, message : "Invalid Promo Code"});

        }

        // check if user has already used the promo
        if (promo.usedBy && promo.usedBy.includes(userId)) {
            return res.json({ success : false, message : "Promo Code already used" });
        }

        //get the order to apply promo code
        const order = await orderModel.findById(orderId);
        
        if(!order) {
            return res.json({ success : false, message : "Order not found" });
        }

        // apply promo to order
        let discount = 0;
        
        switch (promo.discountType){
            case "free_delivery":
                discount = order.deliveryFee;
                order.total -= discount;
                break;

            case "pacentage":
                discount = (order.total * promo.amount) / 100;
                order.total -= discount;
                break;
               
            case "fixed":
                discount = promo.amount;
                order.total -= discount;
                break;
            
            default:
                return res.json({ success : false, message : "Invalid discount type" });    
        }

        //track promo usage
        if( !promo.usedBy) promo.usedBy = [];
        promo.usedBy.push(userId);

        await promo.save();
        await order.save();

        // respond with success
        return res.json({ 
            success : true, 
            message : "Promo Applied", 
            discountType : promo.discountType, 
            newTotal : order.total,
        });

        
    } catch (error) {
        
        return res.json({ success : false, message : "Error applying promo code" });
    }
};

export { applyPromo };