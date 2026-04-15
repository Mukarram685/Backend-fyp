import { sendError } from '../helper/Error.helper.js';
import Bus from '../model/Bus.model.js';
import Schedule from '../model/Schedule.model.js';
import Route from '../model/Route.model.js';

/**
 * @desc    Middleware to validate if an operator has permission for a resource based on their scope
 * @param   {String} resourceType - 'bus', 'route', 'schedule', 'booking'
 * @param   {String} action - 'view', 'manage'
 */
export const validateScope = (resourceType, action = 'manage') => {
  return async (req, res, next) => {
    const user = req.user;
    const resourceId = req.params.id;

    // 1. Company Admin has full control over their company's resources
    if (user.role === 'companyadmin') {
      // Basic check: resource must belong to admin's company
      // This is usually handled in the controller, but can be pre-checked here if resourceId is provided
      return next();
    }

    // 2. Operators have restricted access
    if (user.role === 'operator') {
      const { operatorType, operatorScope } = user;

      // A. Company Manager: Access all resources within the company
      if (operatorType === 'company_manager') {
        return next();
      }

      // If no resourceId is provided (e.g., list view), we might need different logic
      // For now, focus on specific resource access (GET /:id, PUT /:id, DELETE /:id)
      if (!resourceId && req.method !== 'POST') return next();

      // B. City Manager: Manage resources within specific cities
      if (operatorType === 'city_manager') {
        if (!operatorScope.cities || operatorScope.cities.length === 0) {
          return sendError(res, 403, 'Operator has no cities assigned');
        }

        let cityMatch = false;
        if (resourceType === 'bus') {
          // Check if bus is in one of the cities (requires bus info)
          // For simplicity, we assume City Manager can manage buses linked to routes in their cities
          // or we check a specific 'city' field on Bus if it exists.
          // Since our Bus model doesn't have 'city', we might check the routes it serves or permit all
          // if it's within company. Ideally, Bus should have a city/baseCity.
          cityMatch = true; // Placeholder: permit if in company
        } else if (resourceType === 'route' || resourceType === 'schedule') {
          const resource = resourceType === 'route' 
            ? await Route.findById(resourceId) 
            : await Schedule.findById(resourceId).populate('route');
          
          if (!resource) return sendError(res, 404, `${resourceType} not found`);
          
          const route = resourceType === 'route' ? resource : resource.route;
          if (operatorScope.cities.includes(route.fromCity) || operatorScope.cities.includes(route.toCity)) {
            cityMatch = true;
          }
        }

        if (cityMatch) return next();
        return sendError(res, 403, 'Access denied: Resource outside of assigned cities');
      }

      // C. Trip Operator: Specific Bus or Schedule
      if (operatorType === 'trip_operator') {
        if (resourceType === 'bus' && operatorScope.buses.includes(resourceId)) {
          return next();
        }
        if (resourceType === 'schedule' && operatorScope.schedules.includes(resourceId)) {
          return next();
        }
        // Specific case: trip status update
        if (req.originalUrl.includes('/complete') && operatorScope.schedules.includes(resourceId)) {
            return next();
        }

        return sendError(res, 403, 'Access denied: Operator not assigned to this trip/bus');
      }
    }

    return sendError(res, 403, 'Access denied: Insufficient permissions');
  };
};
