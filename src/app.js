require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const bookmarkRouter = require('./bookmarks/bookmarks-router');
const errorHandler = require('./error-handler');
const validateUser = require('./auth-validate');

const app = express();

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

// Middleware pipeline
app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(validateUser);

app.use('/api/bookmarks', bookmarkRouter);

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.use(errorHandler);


module.exports = app;