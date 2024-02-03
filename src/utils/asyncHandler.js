const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => {
      next(error);
    });
  };
};

export default asyncHandler;

//hof => can accept and return a function
const asyncHandlerTRYCATCH = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(error.code || 500).jsoon({
      success: false,
      message: error.message,
    });
  }
};
asyncHandlerTC(greet);
