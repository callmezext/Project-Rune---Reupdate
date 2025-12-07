exports.success = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({ success: true, message, data });
};