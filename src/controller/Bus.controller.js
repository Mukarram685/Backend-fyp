import Bus from '../model/Bus.model.js';
import Company from '../model/Company.model.js';
import { sendError } from '../helper/Error.helper.js';

export const createBus = async (req, res) => {
  try {
    const { busNumber, registrationNumber, type, totalSeats, seatLayout, amenities } = req.body;
    const user = req.user;

    if (!['operator', 'companyadmin'].includes(user.role)) {
      return sendError(res, 403, "Only operators and company admins can add buses");
    }

    const company = await Company.findById(user.company);
    if (!company || company.status !== 'approved') {
      return sendError(res, 403, "Your company is not approved yet");
    }

    const bus = await Bus.create({
      busNumber: busNumber.trim().toUpperCase(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
      type,
      totalSeats,
      seatLayout: seatLayout || '2x2',
      amenities: amenities || [],
      company: user.company,
      operator: user._id
    });

    res.status(201).json({
      success: true,
      message: "Bus added successfully",
      bus
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return sendError(res, 400, `${field} already exists`);
    }
    sendError(res, 500, "Server error");
  }
};

// PROTECTED: Only company members can see their buses
export const getCompanyBuses = async (req, res) => {
  try {
    const buses = await Bus.find({
      company: req.user.company
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: buses.length,
      buses
    });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};

// PUBLIC: For passengers to search (later)
export const getAllActiveBuses = async (req, res) => {
  try {
    const buses = await Bus.find({ status: 'active' })
      .populate('company', 'name')
      .select('busNumber type totalSeats amenities');

    res.json({
      success: true,
      count: buses.length,
      buses
    });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};

export const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return sendError(res, 404, "Bus not found");

    if (bus.company.toString() !== req.user.company.toString()) {
      return sendError(res, 403, "Not authorized");
    }

    res.json({ success: true, bus });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};


export const updateBus = async (req, res) => {
  try {
    console.log(req.params.id);
    const bus = await Bus.findById(req.params.id);
    if (!bus) return sendError(res, 404, "Bus not found");

    if (bus.company.toString() !== req.user.company.toString()) {
      return sendError(res, 403, "Not authorized");
    }

    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: "Bus updated", bus: updatedBus });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};

export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return sendError(res, 404, "Bus not found");

    if (bus.company.toString() !== req.user.company.toString()) {
      return sendError(res, 403, "Not authorized");
    }

    bus.status = 'inactive';
    await bus.save();

    res.json({ success: true, message: "Bus deactivated" });
  } catch (error) {
    sendError(res, 500, "Server error");
  }
};
