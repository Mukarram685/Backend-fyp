import User from "../../model/User.model.js";
import Company from "../../model/Company.model.js";
import { sendError } from "../../helper/Error.helper.js";

// Unified registration used instead

export const UpdateOperatorScope = async (req, res) => {
  try {
    const { id } = req.params;
    const { operatorType, operatorScope } = req.body;
    const admin = req.user;

    const operator = await User.findOne({ _id: id, company: admin.company });
    if (!operator) return sendError(res, 404, "Operator not found in your company");

    if (operatorType) operator.operatorType = operatorType;
    if (operatorScope) operator.operatorScope = operatorScope;

    await operator.save();

    res.status(200).json({
      success: true,
      message: "Operator scope updated successfully",
      operator: {
        id: operator._id,
        name: operator.name,
        operatorType: operator.operatorType,
        operatorScope: operator.operatorScope
      }
    });
  } catch (error) {
    console.error("UpdateOperatorScope Error:", error);
    return sendError(res, 500, "Server error during scope update");
  }
};

export const GetCompanyOperators = async (req, res) => {
  try {
    const admin = req.user;
    const operators = await User.find({ 
      company: admin.company, 
      role: "operator" 
    }).select("-password");

    res.status(200).json({
      success: true,
      operators
    });
  } catch (error) {
    console.error("GetCompanyOperators Error:", error);
    return sendError(res, 500, "Server error while fetching operators");
  }
};
