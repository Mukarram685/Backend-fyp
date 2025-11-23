import User from "../../model/User.model.js";

export const ApproveOperator = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const companyAdmin = req.user;

    if (!["approve", "reject"].includes(action)) {
      return sendError(res, 400, "Action must be 'approve' or 'reject'");
    }

    const operator = await User.findById(id);
    if (!operator) return sendError(res, 404, "Operator not found");

    if (operator.role !== "operator") {
      return sendError(res, 400, "This user is not an operator");
    }

    if (String(operator.company) !== String(companyAdmin.company)) {
      return sendError(res, 403, "You cannot approve operators from another company");
    }

    operator.status = action === "approve" ? "approved" : "rejected";
    operator.approvedBy = companyAdmin._id;

    await operator.save();

    return res.status(200).json({
      success: true,
      message: `Operator ${action}d successfully`,
      operator,
    });
  } catch (error) {
    console.error("ApproveOperator Error:", error);
    return sendError(res, 500, "Server error during operator approval");
  }
};
