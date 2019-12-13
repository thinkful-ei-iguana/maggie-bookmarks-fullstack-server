const { API_TOKEN } = require('./config');
const logger = require('./logger');

function validateUser(req, res, next) {
  const User_API_Key = req.get('Authorization');
  logger.error(`Unauthorized request to path ${req.path}`);

  if (!User_API_Key || User_API_Key.split(' ')[1] !== API_TOKEN) {
    return res
      .status(401)
      .json({ error: 'Unauthorized request' });
  }
  next();
}


module.exports = validateUser;