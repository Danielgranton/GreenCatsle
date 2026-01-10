import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../models/userModel.js";

dotenv.config();

export const connectDB = async () => {
    try{
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error ("MongoDB URI not found in .env file");

        await mongoose.connect(uri);
        console.log("MongoDB connected successfully");

        //check if the  super admin exists
        const superAdminEmail = "granton@gmail.com";
        let admin = await userModel.findOne({
            email : superAdminEmail,
        });

        if(!admin) {
            const bcrypt = await import("bcrypt");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("123456789", salt);

            admin = await userModel.create({
                name : "granton",
                email : superAdminEmail,
                password : hashedPassword,
                role : "admin"
            });

            console.log("Super Admin created successfully", admin.email);
        } else {

            if(admin.role !== "admin") {
                admin.role = "admin";
                await admin.save();

                console.log("Existing user updated to admin:", admin.email);
            } else {
                console.log("Super admin already exists")
            } 
    
        }

    } catch(error){

        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};