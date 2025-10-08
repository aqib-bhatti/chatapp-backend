import express from "express";
import { protectRoute } from "../middleware/authMiddleware.js";
import {
  createGroup,
  getUserGroups,
  // addMembersToGroup,
  // removeMemberFromGroup,
} from "../controller/groupController.js";

const router = express.Router();



router.post("/create", protectRoute,createGroup);
router.get("/user-groups", protectRoute, getUserGroups);
// router.put("/:groupId/add-members",protectRoute, addMembersToGroup);
// router.delete("/:groupId/remove-member/:memberId", removeMemberFromGroup);

export default router;
