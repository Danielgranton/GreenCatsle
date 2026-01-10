import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User doesn't exist" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid credentials" });
        }
        user.lastLogin = new Date();

        await user.save();

        const token = createToken(user);
        res.json({
             success: true,
             token,
             role : user.role,
             user : {
                id : user._id,
                name : user.name,
                email : user.email
             }
            });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

const createToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role,       // << include role
      name: user.name,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // optional expiry
  );
};


const registerUser = async (req, res) => {
    const { name, password, email } = req.body;
    try {
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" });
        }
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name: name,
            email: email,
            password: hashedPassword,
        });

        const user = await newUser.save();
        const token = createToken(user);
        res.json({ 
            success: true,
             token,
             role : user.role,
             user : {
                id : user._id,
                name : user.name,
                email : user.email
             }
             });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await userModel.find({}, 'name email status lastLogin role');

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const loggedInUsers = users.filter(user => user.lastLogin && user.lastLogin > twentyFourHoursAgo);
        res.json({ success: true, users, loggedInUsers, totalLoggedIn: loggedInUsers.length });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching users" });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;

     if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    try {
        const user = await userModel.findByIdAndDelete(id);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({ success: true, message: "User deleted successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error deleting user" });
    }
};

export { loginUser, registerUser, getUsers, deleteUser };
