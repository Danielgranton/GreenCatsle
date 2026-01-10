import express from "express";
import { addFood,listFood, removeFood, updateFood } from "../controllers/foodController.js";
import multer from "multer";
import foodModel from "../models/foodModel.js";
import path from "path";
import crypto from "crypto";


const foodRouter = express.Router();

const storage = multer.diskStorage({
    destination : "uploads",
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = crypto.randomBytes(16).toString("hex");
        cb (null , `${Date.now()}-${name}${ext}`);
    }
})

const upload = multer({storage : storage})

foodRouter.post("/add",upload.single("image"), addFood);
foodRouter.get("/list",listFood);
foodRouter.delete("/delete/:id", removeFood);
foodRouter.put("/update/:id", upload.single("image"), updateFood);
foodRouter.get("/:id", async (req,res) => {
    try {
        const food = await foodModel.findById(req.params.id);
        if(!food) {
            return res.status(404).json({ success : false, message : " Food not found"});
        }
        res.json({ success : true, data : food});
    } catch (error) {
        res.status(500).json({ success : false, message : "Server Error"});
    }
} )



export default foodRouter;