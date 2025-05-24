import express, { json } from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"
import connectDB from "./config/db.js";

dotenv.config();
connectDB();


const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
    console.log(`Server is listenning on ${PORT}`);
})