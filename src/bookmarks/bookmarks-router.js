const path = require('path');
const express = require('express');
const xss = require('xss');
const BookmarksService = require('./bookmarks-service');

const bookmarkRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating)
});


bookmarkRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const newBookmark = { title, url, description, rating };

    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing ${key} in request body` }
        });
      }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res
        .status(400)
        .send('Invalid data');
    }

    const numberRating = parseFloat(rating);
    if (isNaN(numberRating)) {
      return res
        .status(400)
        .send('Invalid data oawjefoijawofa');
    }

    if (numberRating > 5 || numberRating < 1) {
      return res
        .status(400)
        .send('Invalid data');
    }

    BookmarksService.insertBookmarks(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `${bookmark.id}`))
          .json(serializeBookmark(bookmark));
      })
      .catch(next);
  });

bookmarkRouter
  .route('/:bookmark_id')
  .all((req, res, next) => {
    const { bookmark_id } = req.params;
    return BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: 'Bookmark doesn\'t exist' }
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    return res.json(serializeBookmark(res.bookmark));
  })
  .delete((req, res, next) => {
    return BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.bookmark_id
    )
      .then(numRowsAffected => {
        return res.status(204).end();
      })
      .catch(next);
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const updateBookmark = { title, url, description, rating };

    const numberOfValues = Object.values(updateBookmark).filter(Boolean).length;
    console.log('req body is', req.body);
    console.log('updatebookmark is', updateBookmark);

    if (rating && !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: {
          message: 'Rating must be a number between 1 and 5'
        }
      });
    }

    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: 'Request body must contain either title, url, description, or rating'
        }
      });
    }
    return BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.bookmark_id,
      updateBookmark
    )
      .then(numRowsAffected => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarkRouter;