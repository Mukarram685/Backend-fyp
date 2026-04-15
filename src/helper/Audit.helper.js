import AuditLog from '../model/AuditLog.model.js';

/**
 * @desc    Helper to log operator/admin actions
 * @param   {Object} req - Express request object (to get user and IP)
 * @param   {String} action - Action name (e.g., 'create_bus')
 * @param   {String} resource - Resource type ('Bus', 'Schedule', etc.)
 * @param   {String} resourceId - ID of affected resource
 * @param   {String} details - Optional description
 */
export const logActivity = async (req, action, resource, resourceId = null, details = '') => {
  try {
    const user = req.user;
    if (!user) return;

    await AuditLog.create({
      operatorId: user._id,
      companyId: user.company,
      action,
      resource,
      resourceId,
      details,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        role: user.role,
        operatorType: user.operatorType
      }
    });
  } catch (error) {
    console.error('Audit Logging Error:', error);
    // We don't want to break the main request if logging fails
  }
};
