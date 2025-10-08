import express from "express";
import { protectRoute } from "../middleware/authMiddleware.js";
import { 
  getUsersForSidebar, 
  getMessages, 
  sendMessage,
  getGroupMessages,
  sendGroupMessage 
} from "../controller/messageController.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages); 
router.post("/send/:id", protectRoute, sendMessage);

// Group messaging routes
router.get("/group/:groupId", protectRoute, getGroupMessages);
router.post("/group/send/:groupId", protectRoute, sendGroupMessage);

export default router;