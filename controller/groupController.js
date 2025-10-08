import Group from "../models/group.model.js";

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    const adminId = req.user._id;

    const allMembers = [...new Set([adminId, ...memberIds])];
    const groupMembers = allMembers.map((memberId) => ({
      user: memberId,
      role: memberId.toString() === adminId.toString() ? "admin" : "member",
    }));

    const group = new Group({
      name: name || "New Group",
      admin: adminId,
      members: groupMembers,
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "fullName profilePic")
      .populate("members.user", "fullName profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ error: "Failed to create group" });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({
      "members.user": userId,
      isActive: true,
    })
      .populate("admin", "fullName profilePic")
      .populate("members.user", "fullName profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to load groups" });
  }
};

