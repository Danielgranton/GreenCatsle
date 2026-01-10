
import foodModel from "../models/foodModel.js";
import path from "path";
import fs from "fs";

// add food items
const addFood = async (req, res) => {

    let image_filename = `${req.file.filename}`;

    const food = new foodModel({
        name : req.body.name,
        description : req.body.description,
        price : req.body.price,
        category : req.body.category,
        image : image_filename,
    })

    try {

        await food.save();
        res.json({success : true, message : "Food Added Successfully"});

    } catch (error) {
        console.log(error)
        res.json({success : false , message : "Error"})
    }
}

// all food list

const listFood = async (req, res) => {

    try {
        const foods = await foodModel.find({});
        res.json({ success : true, data : foods});
    } catch (error) {
        console.log(error);
        res.json({ success : false, message : "Error"});
    }
}

// remove food items

const removeFood = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Check if food exists
    const food = await foodModel.findById(id);
    if (!food) {
      return res.status(404).json({ success: false, message: "Food not found" });
    }

    // 2. Delete image file safely (check if it exists first)
    const imagePath = path.join("uploads", food.image);
    if (fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Error deleting image:", err);
      });
    }

    // 3. Delete food document
    await foodModel.findByIdAndDelete(id);

    // 4. Send response
    res.json({ success: true, message: "Food item removed successfully" });

  } catch (error) {
    console.error("Remove food error:", error);
    res.status(500).json({ success: false, message: "Server error while removing food" });
  }
};

//update food item
const updateFood = async (req,res) => {
  try {
    
    const {id} = req.params;

    //check if item exists
    const food = await foodModel.findById(id);
    if(!food){
      return res.status(404).json({
        success : false, 
        message : "Food not found"
      });
    }

    // if user uploads new image
    let image_filename = food.image; //default: keep old image

    if (req.file){
      // delete the old image
      const oldImagePath = path.join("uploads", food.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlink(oldImagePath, (err) => {
          if (err) console.log("Error in deleting old image:", err);
        });
      }

      // set the new one

      image_filename = req.file.filename;
    }

    // update fields
    const updateFood = await foodModel.findByIdAndUpdate(
      id,
      {
        name:req.body.name,
        description:req.body.description,
        price:req.body.price,
        category:req.body.category,
        image:image_filename,
      },

      {new: true} // return updated data
    );

    res.json({
      success : true,
      message : "Food item updated successfully",
      data : updateFood, 
    });

  } catch (error) {
    console.log("Update error",error);
    res.status(500).json({success:false, message : "Server error while updating food item"})
  }
}

export {addFood, listFood, removeFood, updateFood}