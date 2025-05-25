import express from "express"
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { addComment, addNewPost, bookmarkPost, deletePost, getAllPost, getCommentsPost, getUserPost, likePost } from "../controllers/post.controller.js";


const router = express.Router();

router.post("/addpost", isAuthenticated, upload.single('image'), addNewPost);
router.get("/all", isAuthenticated, getAllPost);
router.get("userpost/all", isAuthenticated, getUserPost);
router.get("/:id/like", isAuthenticated, likePost);
router.post("/:id/comment", isAuthenticated, addComment);
router.get("/:id/comment/all", isAuthenticated, getCommentsPost);
router.delete("/delete/:id", isAuthenticated, deletePost);
router.get("/:id/bookmark", isAuthenticated, bookmarkPost);

export default router;