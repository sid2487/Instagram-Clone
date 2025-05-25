import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";


export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if(!username || !password || !email){
            return res.status(401).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if(user){
            return res.status(401).json({ message: "User already exist" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword,
        });

        return res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error in signup" });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({ message: "All fields are required" });
        }

        let user = await User.findOne({ email });
        if(!user){
            return res.status(401).json({ message: "Incorrect credentials" });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if(!isPasswordMatch){
            return res.status(401).json({ message: "Incorrect credentials"});
        };

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        // show all the post of user after login
        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            posts: populatedPosts,
        }


        res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 });

        res.status(201).json({ message: `Welcome back ${user.username}`, user });
        return;


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error in login" });
    }
}

export const logout = async (req,res) => {
    try {
        return res.cookie("token", "", {maxAge: 0}).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error in logout" });
    }
}

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).populate({
            path: 'posts',
            options: { sort: { createdAt: -1 } } 
        });

        if(!user){
            return res.status(401).json({ message: "No user found" });
        }

        return res.status(201).json({ message: "user fetched successfully", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error in fetching users profile" });
    }
}

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if(profilePicture){
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if(!user) {
            return res.status(401).json({ message: "User not found" });
        }

        if(bio) user.bio = bio;
        if(gender) user.gender = gender;
        if(profilePicture) user.profilePicture = profilePicture;

        await user.save();

        return res.status(201).json({ message: "Profile updataed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update the profile" });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id}}).select("-password");
        if(!suggestedUsers){
            return res.status(400).json({ message: "do not have any users to recommend" });
        }

        return res.status(200).json({ users: suggestedUsers })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

export const followOrUnfollow = async (req, res) => {
    try {
        const personWhoFollow = req.id; // sid
        const personToBeFollowed = req.params.id; // shruti

        if (personWhoFollow === personToBeFollowed) {
            return res.status(401).json({ message: "Can't follow yourself" });
        }

        const user = await User.findById(personWhoFollow);
        const targetUser = await User.findById(personToBeFollowed);

        if(!user || !targetUser) {
            return res.status(401).json({ message: "User not found" });
        }

        // logic for follow and unfollow
        const isFollowing = user.following.includes(personToBeFollowed);
        if(isFollowing){
            // unfollow logic
            await Promise.all([
                User.updateOne({ _id: personWhoFollow }, { $pull: { following: personToBeFollowed } }),
                User.updateOne({ _id: personToBeFollowed }, { $pull: { followers: personWhoFollow } })
            ])
            return res.status(201).json({ message: "Unfollowed successfully" });

        } else {
            // follow logic
            await Promise.all([
                User.updateOne({ _id: personWhoFollow}, { $push: {following: personToBeFollowed }}),
                User.updateOne({ _id: personToBeFollowed }, { $push: {followers: personWhoFollow }})
            ])
            return res.status(201).json({ message: "Followed successfully" });
        }

        
    } catch (error) {
        console,error(error);
        res.status(500).json({ message: "Error in processing the qurey" });
    }
}