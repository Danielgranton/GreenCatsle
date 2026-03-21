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

        // Optional superadmin bootstrap. Disable unless explicitly configured.
        const superAdminEmail =
          process.env.SUPERADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL;
        const superAdminPassword =
          process.env.SUPERADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;

        if (!superAdminEmail || !superAdminPassword) {
            console.log(
              "SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD not set; skipping superadmin bootstrap."
            );
            return;
        }

        //check if the super admin exists
        let superAdmin = await userModel.findOne({
            email : superAdminEmail,
        });

        if(!superAdmin) {
            const bcrypt = await import("bcrypt");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(superAdminPassword, salt);

            superAdmin = await userModel.create({
                name : "granton",
                email : superAdminEmail,
                password : hashedPassword,
                role : "superadmin"
            });

            console.log("Super Admin created successfully", superAdmin.email);
        } else {

            if(superAdmin.role !== "superadmin") {
                superAdmin.role = "superadmin";
                await superAdmin.save();

                console.log("Existing user updated to superadmin:", superAdmin.email);
            } else {
                console.log("Super admin already exists")
            } 
    
        }

    } catch(error){

        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
};
