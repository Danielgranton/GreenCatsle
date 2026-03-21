import mongoose  from "mongoose";

const businessSchema = new mongoose.Schema({

    name : {
        type : String,
        required : true
    },
    
    category : {
        type : String,
        enum : ['restaurant','hotel','cafe', 'bar', 'resort'],
        required : true,
        
    },

    searchkeywords : [String],
     
    ownerId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'user',
        required : true
    },

	address : {
		type : String,
		required : true
	},

    logo: {
        key: { type: String, default: null },
        provider: { type: String, enum: ["local", "s3"], default: "local" }
    },

    cover: {
        key: { type: String, default: null },
        provider: { type: String, enum: ["local", "s3"], default: "local" }
    },

    location : {
        type : {
            type : String,
            enum : ["Point"],
            default : "Point"
        },

         coordinates : {
        type : [Number],
        required : true
    },

    },

    rating : {
        type : Number,
        default :0
    },

   
    services: [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'service'
    }],

    menu : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'menu'

    }],

    Workers : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'user'
    }],

    status : {
        type : String,
        enum : ['active', 'inactive'],
        default : 'active'
    }
}, {timestamps : true});

businessSchema.index({ location: "2dsphere" });

businessSchema.index({
    name : "text",
    decription : "text",
    address : "text",
    category : "text"
});

const businessModel = mongoose.models.businessModel || mongoose.model("business", businessSchema);

export default businessModel;
