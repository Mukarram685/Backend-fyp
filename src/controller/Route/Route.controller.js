import Route from '../../model/Route.model.js';
import Company from '../../model/Company.model.js';
import { sendError } from '../../helper/Error.helper.js';

export const createRoute = async (req, res) => {
    try {
        const { from, to, fromCity, toCity, distance, duration, company: companyId } = req.body;
        const user = req.user;

        if (!from || !to || !fromCity || !toCity) {
            return sendError(res, 400, "From, To, cities are required");
        }

        const targetCompanyId = user.role === 'superadmin' ? (companyId || user.company) : user.company;
        if (!targetCompanyId) {
            return sendError(res, 400, "Company ID is required to create a route");
        }

        const company = await Company.findById(targetCompanyId);
        if (!company || (user.role !== 'superadmin' && (company.status !== 'approved' || user.status !== 'approved'))) {
            return sendError(res, 403, "Company is not approved or not found");
        }

        const route = await Route.create({
            from,
            to,
            fromCity: fromCity.trim(),
            toCity: toCity.trim(),
            distance,
            duration,
            company: targetCompanyId,
            createdBy: user._id
        });

        return res.status(201).json({
            success: true,
            message: "Route created successfully",
            route
        });

    } catch (error) {
        console.log('error in route controller', error)
        if (error.code === 11000) {
            return sendError(res, 400, "This route already exists for your company");
        }
        sendError(res, 500, "Server error");
    }
};


export const getCompanyRoutes = async (req, res) => {
    try {
    const query = req.user.role === 'superadmin' ? { status: 'active' } : { company: req.user.company, status: 'active' };
    const routes = await Route.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: routes.length,
            routes
        });
    } catch (error) {
        sendError(res, 500, "Server error");
    }
};

export const getRouteById = async (req, res) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return sendError(res, 404, "Route not found");

        if (req.user.role !== 'superadmin' && route.company.toString() !== req.user.company.toString()) {
            return sendError(res, 403, "Not authorized");
        }

        res.json({ success: true, route });
    } catch (error) {
        sendError(res, 500, "Server error");
    }
};


export const updateRoute = async (req, res) => {

    const { id } = req.params;
    try {
        const route = await Route.findById(id);
        if (!route) return sendError(res, 404, "Route not found");

        if (req.user.role !== 'superadmin' && route.company.toString() !== req.user.company.toString()) {
            return sendError(res, 403, "Not authorized");
        }

        const updated = await Route.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        res.json({ success: true, message: "Route updated", route: updated });
    } catch (error) {
        sendError(res, 500, "Server error");
    }
};

export const deleteRoute = async (req, res) => {

    const { id } = req.params;
    try {
        const route = await Route.findById(id);
        if (!route) return sendError(res, 404, "Route not found");

        if (req.user.role !== 'superadmin' && route.company.toString() !== req.user.company.toString()) {
            return sendError(res, 403, "Not authorized");
        }

        route.status = 'inactive';
        await route.save();

        res.json({ success: true, message: "Route deactivated" });
    } catch (error) {
        sendError(res, 500, "Server error");
    }
};