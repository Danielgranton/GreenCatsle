import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({

    businessId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'business',
        required : true
    },

    title : String,

    description : String,

    requirements : String,

    salary : Number,

    status : {
        type : String,
        enum : ['open', 'closed'],
        default : 'open'
    }
})

const jobModel = mongoose.models.jobModel || mongoose.model("job", jobSchema);

export default jobModel;
