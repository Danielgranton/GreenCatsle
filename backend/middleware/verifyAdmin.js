import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ success: false, message: 'No token provided' });

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};
