import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    text: {
        type: text,
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
    }

});

export const Message = mongoose.model("Message", messageSchema);
