import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js";
import dotenv from "dotenv"
import foodRouter from "./routes/foodRoute.js";
import path from "path";
import userRouter from "./routes/userRoute.js";
import cartRouter from "./routes/cartRoute.js";
import deliveryRouter from "./routes/deliveryRouter.js";
import promoRouter from "./routes/promoRoute.js";
import orderRouter from "./routes/orderRoute.js";
import statsRoute from "./routes/statsRoute.js";

dotenv.config();

//app config
const app = express();
const port = process.env.PORT || 4000;

//middleware

app.use (express.json());
app.use (cors());
app.use(express.urlencoded({extended: true}));
//db connection 
console.log("MONGO_URI:", process.env.MONGO_URI);
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


app.get("/", ( req, res) => {
    res.send("API working");
})

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`); 
})

//mongodb+srv://danielgranton:<db_password>@cluster0.iiabbqa.mongodb.net/?