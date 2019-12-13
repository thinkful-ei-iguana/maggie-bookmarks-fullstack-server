require('dotenv').config();
const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');

describe('Bookmarks endpoints', function () {

  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });

    app.set('db', db);

  });

  before('clean db', () => db('bookmarks').truncate());

  afterEach('cleanup', () => db('bookmarks').truncate());

  after('disconnect from db', () => db.destroy());


  describe('Unauthorized requests', () => {
    beforeEach('insert bookmarks', () => {

      return db
        .into('bookmarks')
        .insert(makeBookmarksArray());
    });

    it('responds with 401 unauthorized for GET /api/bookmarks', () => {
      return supertest(app)
        .get('/api/bookmarks')
        .expect(401, { error: 'Unauthorized request' });
    });
    it('responds with 401 unauthorized for POST /api/bookmarks', () => {
      return supertest(app)
        .post('/api/bookmarks')
        .send({
          title: 'test title',
          url: 'http://www.testurl.com',
          description: 'test content',
          rating: 1
        })
        .expect(401, { error: 'Unauthorized request' });
    });
    it('responds with 401 unauthorized for GET /api/bookmarks/:id', () => {

      return supertest(app)
        .get(`/api/bookmarks/${makeBookmarksArray.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });
    it('responds with 401 unauthorized for DELETE /api/bookmarks/:id', () => {
      return supertest(app)
        .delete(`/api/bookmarks/${makeBookmarksArray.id}`)
        .expect(401, { error: 'Unauthorized request' });
    });
    it('responds with 401 unauthorized for PATCH /api/bookmarks/:id', () => {
      return supertest(app)
        .patch(`/api/bookmarks/${makeBookmarksArray.id}`)
        .send({ title: 'updating title to something fresh' })
        .expect(401, { error: 'Unauthorized request' });
    });
  });

  describe('GET /api/bookmarks', () => {
    context('Given no bookmarks', () => {
      it('responds with 200 and an empty list', () => {
        console.log(process.env.API_TOKEN);
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(makeBookmarksArray());
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, makeBookmarksArray());
      });
    });
  });

  describe('GET /api/bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      context('Given an xss attack bookmark', () => {
        const maliciousBookmark = {
          id: 911,
          title: 'Malice malice malice <script>alert("xss");</script>',
          url: 'http://www.google.com',
          description: 'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
          rating: '4'
        };

        beforeEach('insert malicious bookmark', () => {
          return db
            .into('bookmarks')
            .insert([maliciousBookmark]);
        });

        it('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/bookmarks/${maliciousBookmark.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql('Malice malice malice &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
              expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`);
            });
        });
      });
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(makeBookmarksArray());
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });

  describe('POST /api/bookmarks', () => {
    it('creates a bookmark, responding with 201 and the new bookmark', function () {
      this.retries(3);
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'http://www.rocket.com',
        description: 'such a great new bookmark',
        rating: 3
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.style).to.eql(newBookmark.style);
          expect(res.body.content).to.eql(newBookmark.content);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
          // const expected = new Date().toLocaleString();
          // const actual = new Date(res.body.date_published).toLocaleString();
          // expect(actual).to.eql(expected);
        })
        .then(res =>
          supertest(app)
            .get(`/api/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        );
    });

    const requiredFields = ['title', 'url', 'rating'];
    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test title',
        url: 'http://www.google.com',
        rating: '3',
        description: 'test description'
      };

      it(`responds with 400 and error msg when the ${field} is missing`, () => {
        delete newBookmark[field];
        return supertest(app)
          .post('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing ${field} in request body` }
          });
      });
    });
  });

  describe.only('PATCH /api/bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        return supertest(app)
          .patch(`/api/bookmarks/1234`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    const testBookmarks = makeBookmarksArray();
    context('Given there are bookmarks in the database', () => {
      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(makeBookmarksArray());
      });

      it('responds with 204 and updates the bookmark', () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: 'updated bookmark title',
          url: 'https://updated-url.com',
          description: 'updated bookmark description',
          rating: 1,
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        };
        return supertest(app)
          .patch(`/api/boomarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          )
      });

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either title, url, description, or rating`
            }
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated bookmark title',
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: 'should not be in GET response'
          })
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          )
      })

      it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
        const idToUpdate = 2
        const updateInvalidRating = {
          rating: 'invalid',
        }
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send(updateInvalidRating)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, {
            error: {
              message: `'rating' must be a number between 0 and 5`
            }
          })
      })

      it(`responds with 400 invalid 'url' if not a valid URL`, () => {
        const idToUpdate = 2
        const updateInvalidUrl = {
          url: 'htp://invalid-url',
        }
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send(updateInvalidUrl)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(400, {
            error: {
              message: `'url' must be a valid URL`
            }
          })
      })
    })
  })

  describe('DELETE /api/bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 123456;
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: {
              message: 'Bookmark doesn\'t exist'
            }
          });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(makeBookmarksArray());
      });

      it('responds with 204 and removes the bookmark', () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);
        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get('/api/bookmarks')
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          );
      });
    });
  });

});
