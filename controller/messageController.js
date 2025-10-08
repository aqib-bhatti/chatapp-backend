import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import redis from "../lib/radis.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const cacheKey = `chat:${myId}:${userToChatId}`;

    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId, messageType: "direct" },
        { senderId: userToChatId, receiverId: myId, messageType: "direct" },
      ],
    })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    await redis.setex(cacheKey, 600, JSON.stringify(messages));

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      messageType: "direct",
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    const cacheKey1 = `chat:${senderId}:${receiverId}`;
    const cacheKey2 = `chat:${receiverId}:${senderId}`;
    const messageData = JSON.stringify([populatedMessage]);

   
    await redis.del(cacheKey1);
    await redis.del(cacheKey2);

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      isActive: true,
    });

    if (!group) {
      return res
        .status(404)
        .json({ error: "Group not found or access denied" });
    }

    const cacheKey = `group_messages:${groupId}`;
    const cachedMessages = await redis.get(cacheKey);

    if (cachedMessages) {
      console.log("📦 Returning group messages from Redis cache");
      return res.status(200).json(JSON.parse(cachedMessages));
    }

    const messages = await Message.find({
      groupId,
      messageType: "group",
    })
      .populate("senderId", "fullName profilePic")
      .populate("groupId", "name")
      .sort({ createdAt: 1 });

    await redis.set(cacheKey, JSON.stringify(messages), "EX", 60 * 5);

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    
    const group = await Group.findOne({
      _id: groupId,
      "members.user": senderId,
      isActive: true,
    });

    if (!group) {
      return res
        .status(404)
        .json({ error: "Group not found or access denied" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      messageType: "group",
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "fullName profilePic")
      .populate("groupId", "name");

    const cacheKey = `group_messages:${groupId}`;
    await redis.del(cacheKey);

  
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member.user.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroupMessage", populatedMessage);
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
