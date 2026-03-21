import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";


// helper functions
const createToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            businessId: user.businessId || null,
            name: user.name,
            email: user.email,
            tokenVersion: Number.isFinite(Number(user.tokenVersion)) ? Number(user.tokenVersion) : 0,
        },
        process.env.JWT_SECRET,
        { expiresIn : "7d"}
    );
};

const formUser = (user) => ({
    id : user._id,
    name : user.name,
    email : user.email,
    role : user.role,
    status : user.status,
    businessId: user.businessId || null,
    avatarKey: user.avatar?.key || null
});

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
        res.status(200).json({
             success: true,
             token,
             message: "Login successful",
             user :  formUser(user),
            });

    } catch (error) {
        console.log(error);
        res.status(500).json({
             success: false,
              message: "Error"
             });
    }
};


// register users
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
            role: "user"
        });

        const user = await newUser.save();
        const token = createToken(user);
        res.status(201).json({
            success: true,
             token,
             message: "User registered successfully",
             user : formUser(user)
             });

    } catch (error) {
        console.log(error);
        res.status(500).json({
             success: false,
              message: "Error" 
            });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await userModel.find({}, 'name email status lastLogin role');

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const loggedInUsers = users.filter(user => user.lastLogin && user.lastLogin > twentyFourHoursAgo);
        res.status(200).json({
             success: true,
              users, 
              loggedInUsers,
               totalLoggedIn: loggedInUsers.length
             });

    } catch (error) {
        console.log(error);
        res.status(500).json({ 
            success: false,
             message: "Error fetching users"
         });
    }
};

// update user profile

const updateUser = async (req, res) => {
  try {
    const userId = req.user.id; // comes from authMiddleware
    const { name, email, password, phone } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields if provided
    if (name) user.name = name;

    if (email) {
      if (!validator.isEmail(email)) {
        return res.json({
          success: false,
          message: "Invalid email",
        });
      }
      const nextEmail = String(email).toLowerCase().trim();
      if (nextEmail !== String(user.email).toLowerCase()) {
        const exists = await userModel.findOne({ email: nextEmail }).select("_id");
        if (exists) {
          return res.json({ success: false, message: "Email already in use" });
        }
        user.email = nextEmail;
      }
    }

    if (typeof phone === "string") user.phone = phone;

    if (password) {
      if (password.length < 8) {
        return res.json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Error updating profile",
    });
  }
};

export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) return res.status(409).json({ success: false, message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    user.tokenVersion = (Number(user.tokenVersion) || 0) + 1; // invalidate existing sessions
    await user.save();

    const token = createToken(user);
    res.status(200).json({ success: true, message: "Password updated", token, user: formUser(user) });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to change password" });
  }
};

export const logoutAllSessions = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.tokenVersion = (Number(user.tokenVersion) || 0) + 1;
    await user.save();
    res.status(200).json({ success: true, message: "Logged out all sessions" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to logout sessions" });
  }
};

export const updateNotificationPrefs = async (req, res) => {
  try {
    const { inApp, email } = req.body || {};
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (typeof inApp === "boolean") user.notificationPrefs.inApp = inApp;
    if (typeof email === "boolean") user.notificationPrefs.email = email;
    await user.save();
    res.status(200).json({ success: true, notificationPrefs: user.notificationPrefs });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to update preferences" });
  }
};

// delete user
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
            return res.status(404).json({
                 success: false,
                  message: "User not found"
                 });
        }
        res.status(200).json({ 
            success: true,
             message: "User deleted successfully" 
            });

    } catch (error) {
        console.log(error);
        res.status(500).json({
             success: false, 
             message: "Error deleting user" 
            });
    }
};

const getCurrentUser = async (req, res)  => {
    try {
        
        const user = await userModel.findById(req.user.id).select("-password");

        if(!user) {
            return res.status(404).json({
                success : true,
                message : "User not found"
            });
        };

        res.status(200).json({
            success : true,
            user
        })


    } catch (error) {
        console.log(error);
        res.status(500).json({
            success : false,
            message : "Erroe fetching user",
        })
        
    }
}

export { loginUser, registerUser, getUsers, deleteUser, updateUser, getCurrentUser };
