
import foodModel from "../models/foodModel.js";
import { deleteObject, makeObjectKey, putObject } from "../services/storageService.js";

// add food items
const addFood = async (req, res) => {

    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const key = makeObjectKey({ folder: "food", originalName: req.file.originalname });
    await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

    const food = new foodModel({
        name : req.body.name,
        description : req.body.description,
        price : req.body.price,
        category : req.body.category,
        image : key,
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

    // 2. Delete stored image (S3 or local)
    if (food.image) await deleteObject({ key: food.image });

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
    let imageKey = food.image; //default: keep old image

    if (req.file?.buffer){
      const newKey = makeObjectKey({ folder: "food", originalName: req.file.originalname });
      await putObject({ buffer: req.file.buffer, contentType: req.file.mimetype, key: newKey });
      if (food.image) await deleteObject({ key: food.image });
      imageKey = newKey;
    }

    // update fields
    const updateFood = await foodModel.findByIdAndUpdate(
      id,
      {
        name:req.body.name,
        description:req.body.description,
        price:req.body.price,
        category:req.body.category,
        image:imageKey,
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
