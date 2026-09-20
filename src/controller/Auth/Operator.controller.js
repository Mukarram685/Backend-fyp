import User from "../../model/User.model.js";
import Company from "../../model/Company.model.js";
import { sendError } from "../../helper/Error.helper.js";

export const UpdateOperatorScope = async (req, res) => {
  try {
    const { id } = req.params;
    const { operatorType, operatorScope } = req.body;
    const admin = req.user;

    if (admin.role === 'operator' && admin.operatorType !== 'company_manager') {
      return sendError(res, 403, "Only Company Managers, Company Admins, and Superadmins can update scope");
    }

    const query = admin.role === "superadmin" ? { _id: id, role: "operator" } : { _id: id, company: admin.company, role: "operator" };
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
    let query = { role: "operator", _id: { $ne: admin._id } };

    if (admin.role === "superadmin") {
      query = { role: "operator", _id: { $ne: admin._id } };
    } else if (admin.role === "companyadmin") {
      query = { company: admin.company, role: "operator", _id: { $ne: admin._id } };
    } else if (admin.role === "operator" && admin.operatorType === "company_manager") {
      query = {
        company: admin.company,
        role: "operator",
        _id: { $ne: admin._id },
        operatorType: { $in: ["city_manager", "trip_operator"] }
      };
    } else if (admin.role === "operator" && admin.operatorType === "city_manager") {
      const assignedCities = admin.operatorScope?.cities || [];
      query = {
        company: admin.company,
        role: "operator",
        _id: { $ne: admin._id },
        $or: [
          { "operatorScope.cities": { $in: assignedCities } },
          { operatorType: "trip_operator" }
        ]
      };
    } else {
      query = { _id: { $ne: admin._id }, role: "operator" };
    }

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

export const ChangeOperatorPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const currentUser = req.user;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 400, "New password must be at least 6 characters long");
    }

    const isSuperAdmin = currentUser.role === "superadmin";
    const isCompanyAdmin = currentUser.role === "companyadmin";
    const isCompanyManager = currentUser.role === "operator" && currentUser.operatorType === "company_manager";

    if (!isSuperAdmin && !isCompanyAdmin && !isCompanyManager) {
      return sendError(res, 403, "You do not have permission to change operator passwords");
    }

    const query = isSuperAdmin ? { _id: id } : { _id: id, company: currentUser.company };
    const targetUser = await User.findOne(query);

    if (!targetUser) {
      return sendError(res, 404, "User/Operator not found in your company");
    }

    // Role hierarchy enforcement
    if (isCompanyManager) {
      if (targetUser.role === "superadmin" || targetUser.role === "companyadmin") {
        return sendError(res, 403, "Company Managers cannot change the password of Company Admins or Superadmins");
      }
      if (targetUser.operatorType === "company_manager" && targetUser._id.toString() !== currentUser._id.toString()) {
        return sendError(res, 403, "Company Managers cannot change the password of other Company Managers");
      }
    }

    if (isCompanyAdmin) {
      if (targetUser.role === "superadmin") {
        return sendError(res, 403, "Company Admins cannot change the password of Superadmins");
      }
    }

    // Assign and save (pre-save hook will hash it)
    targetUser.password = newPassword;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `Password for ${targetUser.name} (${targetUser.email}) updated successfully`,
    });
  } catch (error) {
    console.error("ChangeOperatorPassword Error:", error);
    return sendError(res, 500, error.message || "Server error while changing password");
  }
};
