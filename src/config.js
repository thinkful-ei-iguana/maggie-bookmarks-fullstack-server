module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_URL: process.env.DB_URL || 'postgresql://dunder_mifflin@localhost/bookmarks',
  API_TOKEN: process.env.API_TOKEN || '099c71d7-260b-450b-800f-21ad8eb77e04'
};