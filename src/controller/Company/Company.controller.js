import Company from "../../model/Company.model.js";
import User from "../../model/User.model.js";
import { sendError } from "../../helper/Error.helper.js";

export const CreateCompany = async (req, res) => {
  try {
    const { name, email, address, phone, userId } = req.body;

    if (!name || !email || !address) {
      return sendError(res, 400, "Please provide all required fields (name, email, address)");
    }

    const existing = await Company.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, 409, "Company already exists with this email");

    const createdBy = req.user ? req.user._id : (userId || null);

    if (!createdBy) {
      return sendError(res, 400, "User account required. Please log in or provide userId to create a company request.");
    }

    const company = await Company.create({
      name,
      email: email.toLowerCase(),
      address,
      phone,
      createdBy,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Company request submitted successfully. Waiting for Super Admin approval.",
      company,
    });
  } catch (error) {
    console.error("CreateCompany Error:", error);
    return sendError(res, 500, error.message || "Server error while creating company");
  }
};


export const ApproveCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, status } = req.body;

    const targetStatus = status || (action === "approve" ? "approved" : action === "reject" ? "rejected" : action);

    if (!["approved", "rejected", "pending"].includes(targetStatus)) {
      return sendError(res, 400, "Status must be 'approved', 'rejected', or 'pending'");
    }

    const company = await Company.findById(id);
    if (!company) return sendError(res, 404, "Company not found");

    company.status = targetStatus;
    company.approvedBy = req.user._id;

    await company.save();

    // When Super Admin approves or changes company status, update creator accordingly
    if (company.createdBy) {
      const creator = await User.findById(company.createdBy);
      if (creator) {
        if (targetStatus === "approved") {
          creator.role = "companyadmin";
          creator.company = company._id;
          creator.status = "approved";
        } else if (targetStatus === "rejected") {
          creator.status = "rejected";
        } else if (targetStatus === "pending") {
          creator.status = "pending";
        }
        await creator.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Company status updated to '${targetStatus}' successfully`,
      company,
    });
  } catch (error) {
    console.error("ApproveCompany Error:", error);
    return sendError(res, 500, "Server error during company approval/status update");
  }
};


export const GetCompanies = async (req, res) => {
  try {
    const user = req.user;
    let query = {};
    if (user && user.role === "companyadmin") {
      const companyId = user.company ? (user.company._id || user.company) : null;
      if (companyId) {
        query = { _id: companyId };
      }
    }
    const companies = await Company.find(query).populate("createdBy", "name email role status phoneNumber");
    return res.status(200).json({ success: true, companies });
  } catch (error) {
    console.error("GetCompanies Error:", error);
    return sendError(res, 500, "Server error while fetching companies");
  }
};


export const GetCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id).populate("createdBy", "name email role status phoneNumber");
    if (!company) return sendError(res, 404, "Company not found");
    return res.status(200).json({ success: true, company });
  }
  catch (error) {
    console.error("GetCompany Error:", error);
    return sendError(res, 500, "Server error while fetching company");
  }
};

export const ChangeCompanyPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const currentUser = req.user;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 400, "New password must be at least 6 characters long");
    }

    if (currentUser.role !== "superadmin" && currentUser.role !== "companyadmin") {
      return sendError(res, 403, "Permission denied");
    }

    // If companyadmin, ensure they are changing password for their own company
    const currentCompanyId = currentUser.company ? (currentUser.company._id || currentUser.company).toString() : "";
    if (currentUser.role === "companyadmin" && currentCompanyId !== id.toString()) {
      return sendError(res, 403, "Company Admins can only change the password of their own company");
    }

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, 404, "Company not found");
    }

    // Find the company administrator account
    let targetUser = null;
    if (company.createdBy) {
      targetUser = await User.findById(company.createdBy);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ company: company._id, role: "companyadmin" });
    }
    if (!targetUser) {
      targetUser = await User.findOne({ company: company._id });
    }

    if (!targetUser) {
      return sendError(res, 404, "No user account found associated with this company");
    }

    targetUser.password = newPassword;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `Password for company '${company.name}' (${targetUser.email}) updated successfully`,
    });
  } catch (error) {
    console.error("ChangeCompanyPassword Error:", error);
    return sendError(res, 500, error.message || "Server error while updating company password");
  }
};

export const deteleCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) return sendError(res, 404, "Company not found");
    await company.deleteOne();
    return res.status(200).json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    console.error("DeleteCompany Error:", error);
    return sendError(res, 500, "Server error while deleting company");
  }
};