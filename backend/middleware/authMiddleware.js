import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, login again",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false, 
        message: "Account inactive or not found",
      })

    }

    const decodedVersion = Number.isFinite(Number(decoded?.tokenVersion)) ? Number(decoded.tokenVersion) : 0;
    const userVersion = Number.isFinite(Number(user?.tokenVersion)) ? Number(user.tokenVersion) : 0;
    if (decodedVersion !== userVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired, please log in again",
      });
    }

    req.user = user;
    next();

    
  } catch (error) {
    console.error(error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
