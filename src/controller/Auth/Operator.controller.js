import User from "../../model/User.model.js";
import Company from "../../model/Company.model.js";
import { sendError } from "../../helper/Error.helper.js";

export const UpdateOperatorScope = async (req, res) => {
  try {
    const { id } = req.params;
    const { operatorType, operatorScope } = req.body;
    const admin = req.user;

    const query = admin.role === "superadmin" ? { _id: id } : { _id: id, company: admin.company };
    const operator = await User.findOne(query);
    if (!operator) return sendError(res, 404, "Operator not found");

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
    const query = admin.role === "superadmin" ? { role: "operator" } : { company: admin.company, role: "operator" };
    const operators = await User.find(query).select("-password").populate("company", "name");

    res.status(200).json({
      success: true,
      operators
    });
  } catch (error) {
    console.error("GetCompanyOperators Error:", error);
    return sendError(res, 500, "Server error while fetching operators");
  }
};
