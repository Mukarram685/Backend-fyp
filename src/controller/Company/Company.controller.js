import Company from "../../model/Company.model.js";
import { sendError } from "../../helper/Error.helper.js";

export const CreateCompany = async (req, res) => {
  try {
    const { name, email, address, phone } = req.body;

    if (!name || !email || !address) {
      return sendError(res, 400, "Please provide all required fields");
    }

    const existing = await Company.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, 409, "Company already exists");

    const company = await Company.create({
      name,
      email: email.toLowerCase(),
      address,
      phone,
      createdBy: req.user._id,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully. Waiting for approval.",
      company,
    });
  } catch (error) {
    console.error("CreateCompany Error:", error);
    return sendError(res, 500, "Server error while creating company");
  }
};


export const ApproveCompany = async (req, res) => {
  try {
    const { id } = req.params; // company id
    const { action } = req.body; // "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return sendError(res, 400, "Action must be 'approve' or 'reject'");
    }

    const company = await Company.findById(id);
    if (!company) return sendError(res, 404, "Company not found");

    company.status = action === "approve" ? "approved" : "rejected";
    company.approvedBy = req.user._id;

    await company.save();

    return res.status(200).json({
      success: true,
      message: `Company ${action}d successfully`,
      company,
    });
  } catch (error) {
    console.error("ApproveCompany Error:", error);
    return sendError(res, 500, "Server error during company approval");
  }
};
