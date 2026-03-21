import dotenv from "dotenv"
dotenv.config();

import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import foodRouter from "./routes/foodRoute.js";
import path from "path";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import deliveryRouter from "./routes/deliveryRouter.js";
import promoRouter from "./routes/promoRoute.js";
import orderRouter from "./routes/orderRoute.js";
import statsRoute from "./routes/statsRoute.js";
import businessRouter from "./routes/businessRoute.js";
import discoveryRouter from "./routes/discoveryRoute.js";
import paymentRoutes from "./routes/paymentRoute.js";
import webhookRouter from "./routes/webhookRoute.js";
import stripeWebhookRouter from "./routes/stripeWebhookRoute.js";
import mediaRouter from "./routes/mediaRoute.js";
import jobRouter from "./routes/jobRoute.js";
import businessApplicationRouter from "./routes/businessApplicationRoute.js";
import adminRouter from "./routes/adminRoute.js";
import walletRouter from "./routes/walletRoute.js";
import payoutRouter from "./routes/payoutRoute.js";
import notificationRouter from "./routes/notificationRoute.js";
import reviewRouter from "./routes/reviewRoute.js";
import complaintRouter from "./routes/complaintRoute.js";
import advertRouter from "./routes/advertRoute.js";
import superAdminRouter from "./routes/superAdminRoute.js";
import menuHierarchyRouter from "./routes/menuHierarchyRoute.js";
import menuItemRouter from "./routes/menuItemRoute.js";
import menuMediaRouter from "./routes/menuMediaRoute.js";
import businessSettingsRouter from "./routes/businessSettingsRoute.js";
import jobApplicationRouter from "./routes/jobApplicationRoute.js";

const app = express();
app.set("trust proxy", 1);

const port = process.env.PORT || 4000;
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

import { Server } from "socket.io";
import http from "http";
import { setIO } from "./realtime/io.js";
import jwt from "jsonwebtoken";
import userModel from "./models/userModel.js";

const server = http.createServer(app);
export const io = new Server(server, {
  cors : {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
})
setIO(io);

io.on("connection", (socket) => {

  console.log("User connected", socket.id);

  // Optional auth for notifications: client can send token in `socket.handshake.auth.token`.
  const token = socket.handshake?.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userModel
        .findById(decoded.id)
        .then((user) => {
          if (!user) return;
          socket.data.userId = String(user._id);
          socket.join(`user:${String(user._id)}`);
          if (user.businessId) socket.join(`business:${String(user.businessId)}`);
        })
        .catch(() => {});
    } catch {
      // ignore invalid token
    }
  }

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  })
})

io.on("connection", (socket) => {

  socket.on("joinOrderRoom", (orderId) => {
    socket.join(orderId);
  });
});

//app config


//middleware


const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  "https://green-catsle-6jue.vercel.app",
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const isDev = process.env.NODE_ENV !== "production";
const isLocalhostOrigin = (origin) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman / server requests
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isDev && isLocalhostOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// app.options("*", cors());

app.use(express.urlencoded({extended: true}));
//db connection 
connectDB();

//api endpoints
app.use("/api/food", foodRouter);
const __dirname = path.resolve();
app.use("/images", express.static(path.join(__dirname, "/uploads")));
app.use("/api/users", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/promos", promoRouter);
app.use("/api/orders", orderRouter);
app.use("/api/stats", statsRoute);
app.use("/api/business", businessRouter);
app.use("/api/discover", discoveryRouter);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRouter);
app.use("/api/webhooks", stripeWebhookRouter);
app.use("/api/media", mediaRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/job-applications", jobApplicationRouter);
app.use("/api/business-applications", businessApplicationRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wallets", walletRouter);
app.use("/api/payouts", payoutRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/adverts", advertRouter);
app.use("/api/superadmin", superAdminRouter);
app.use("/api/menu-hierarchy", menuHierarchyRouter);
app.use("/api/menu-items", menuItemRouter);
app.use("/api/menu-media", menuMediaRouter);
app.use("/api/business-settings", businessSettingsRouter);


app.get("/", ( req, res) => {
    res.send("API working");
})

server.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`); 
})

//mongodb+srv://danielgranton:<db_password>@cluster0.iiabbqa.mongodb.net/?
