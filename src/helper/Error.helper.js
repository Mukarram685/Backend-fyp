export const sendError = (res, status, message) => {
    return res.status(status).json({ success: false, message });
};