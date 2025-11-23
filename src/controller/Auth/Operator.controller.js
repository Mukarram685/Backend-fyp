import User from "../../model/User.model.js";
import Company from "../../model/Company.model.js";
import { sendError } from "../../helper/Error.helper.js";

export const RegisterOperator = async (req, res) => {
  try {
    const { name, email, password, company } = req.body;

    if (!name || !email || !password || !company) {
      return sendError(res, 400, "Please provide all required fields");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, 409, "Email already registered");

    const companyExists = await Company.findById(company);
    if (!companyExists) return sendError(res, 404, "Company not found");
    if (companyExists.status !== "approved") {
      return sendError(res, 400, "Cannot add operator to unapproved company");
    }

    const operator = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "operator",
      company,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Operator created successfully. Pending approval from CompanyAdmin.",
      operator: {
        id: operator._id,
        name: operator.name,
        email: operator.email,
        company: operator.company,
        status: operator.status,
      },
    });
  } catch (error) {
    console.error("RegisterOperator Error:", error);
    return sendError(res, 500, "Server error during operator registration");
  }
};
