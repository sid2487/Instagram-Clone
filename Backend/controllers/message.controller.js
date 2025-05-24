import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

export const sendMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const recieverId = req.params.id;
        const { textMessage: message } = req.body;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recieverId] }
        });

        // establish the connection if not started yet
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recieverId]
            })

            const newMessage = await Message.create({
                senderId,
                recieverId,
                message,
            });

            if (newMessage) {
                conversation.messages.push(newMessage._id);
            }

            await Promise.all([conversation.save(), newMessage.save()]);

            // socket code

            return res.status(201).json({ newMessage });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error in sending message" });
    }
}

export const getMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all: [senderId, receiverId]}
        }).populate('message');

        if(!conversation){
        return res.status(500).json({ messages: [] }); 
        }
        
        return res.status(201).json({ message: conversation?.messages });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error in fetching message" });
    }
}