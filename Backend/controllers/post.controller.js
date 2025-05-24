import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";


export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if(!image){
            return res.status(401).json({ message: "Image required" });
        }

        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();

        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri);

        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });

        const user = await User.findById(authorId);
        if(user){
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({ message: "New post added", post, });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error in posting, try again!!"})
    }
}

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
        .populate({ path: 'author', select: 'username profilePicture' })
        .populate({
            path: 'comments',
            sort: { createdAt: -1},
            populate: { path: 'author', select: 'username profilePicture'}
        });

        return res.status(201).json({ posts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong!"})
    }
}

export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1})
        .populate({ path: 'author', select: 'username, profilePicture' })
        .populate({ path: 'comments', sort: { createdAt: -1}, 
         populate: { path: 'author', select: 'username, profilePicture' }
        });

        return res.status(201).json({ posts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error in fetchig the post, try again later!" });
    }
}

export const likePost = async (req, res) => {
    try {
        const userWhoWillLike = req.id; // like karne wale user ki id
        const postId = req.params.id;
        const post = await Post.findById(postId);
        
        if(!post){
            return res.status(401).json({ message: "Post not found" });
        }

       // like logic
       await post.updateOne({ $addToSet: { likes: userWhoWillLike }});
       await post.save();

        // socket code 

        return res.status(201).json({ message: "Post liked", likesCount: post.likes.length, })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" })
    }
}

export const dislikePost = async (req, res) => {
    try {
        const userWhoWillLike = req.id;
        const post = req.params.id;
        if(!post){
            return res.status(401).json({ message: "Post not found" });
        }

        // dislike logic
        await post.updateOne({ $pull: { likes: userWhoWillLike }});
        await post.save();

        // socket logic

        return res.status(201).json({ message: "Post unliked" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const idOfUserWhoComment = req.id;

        const { text } = req.body;

        const post = await Post.findById(postId);
        
        if(!text){
            return res.status(401).json({ message: "Comment first!" });
        }

        const comment = await Comment.create({
            text,
            author: idOfUserWhoComment,
            post: postId,
        })

        await comment.populate({ path: 'author', select: 'username, profilePicture' });

        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({ message: "Comment added", comment, })

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

export const getCommentsPost = async (req, res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({ post: postId}).populate('author', 'username profilePicture');

        if(!comments) {
            return res.status(401).json({ message: "No comments found" });
        }

        return res.status(201).json({ comments });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

export const deletePost = async(req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post){
            return res.status(401).json({ message: "Post not found" });
        }

        if(post.author.toString() !== authorId) {
            return res.status(401).json({ message: "Unauthorized user" });
        }

        // delete post
        await Post.findByIdAndDelete(postId);

        // remove the post id from the users post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId );
        await user.save();

        // delete associated comments
        await Comment.deleteMany({ post: postId });

        return res.status(201).json({ message: "Post deleted" })
        

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Can't delete, something went wrong!"})
    }
}

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post){
            return res.status(401).json({ message: "Post not found" });
        }

        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // remove from bookmarks
            await user.updateOne({ $pull: {bookmarks: post._id }});
            await user.save();
            return res.status(200).json({ type: 'unsaved', message: "Post removed from bookmark" });
        } else {
            await user.updateOne({ $addToSet: { bookmarks: post._id }});
            await user.save();
            return res.status(200).json({ type: 'saved', message: "Post added to bookmark" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong in bookmark" });
    }
}