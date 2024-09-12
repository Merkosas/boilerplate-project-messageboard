const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread', delete_password: 'password' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'reported');
        assert.property(res.body, 'delete_password');
        assert.property(res.body, 'replies');
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    chai.request(server)
      .get('/api/threads/testboard')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        res.body.forEach(thread => {
          assert.property(thread, '_id');
          assert.property(thread, 'text');
          assert.property(thread, 'created_on');
          assert.property(thread, 'bumped_on');
          assert.property(thread, 'replies');
          assert.isAtMost(thread.replies.length, 3);
          thread.replies.forEach(reply => {
            assert.property(reply, '_id');
            assert.property(reply, 'text');
            assert.property(reply, 'created_on');
          });
        });
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
    chai.request(server)
      .delete('/api/threads/testboard')
      .send({ thread_id: 'invalid_id', delete_password: 'wrongpassword' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread to delete', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .delete('/api/threads/testboard')
          .send({ thread_id: thread_id, delete_password: 'password' })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread to report', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .put('/api/threads/testboard')
          .send({ thread_id: thread_id })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'reported');
            done();
          });
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread for reply', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .post('/api/replies/testboard')
          .send({ text: 'Test reply', delete_password: 'password', thread_id: thread_id })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, '_id');
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'delete_password');
            assert.property(res.body, 'reported');
            done();
          });
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread for viewing', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .get(`/api/replies/testboard?thread_id=${thread_id}`)
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, '_id');
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.property(res.body, 'replies');
            res.body.replies.forEach(reply => {
              assert.property(reply, '_id');
              assert.property(reply, 'text');
              assert.property(reply, 'created_on');
            });
            done();
          });
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread for reply deletion', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .post('/api/replies/testboard')
          .send({ text: 'Test reply to delete', delete_password: 'password', thread_id: thread_id })
          .end(function(err, res) {
            const reply_id = res.body._id;
            chai.request(server)
              .delete('/api/replies/testboard')
              .send({ thread_id: thread_id, reply_id: reply_id, delete_password: 'wrongpassword' })
              .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'incorrect password');
                done();
              });
          });
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread for reply deletion', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .post('/api/replies/testboard')
          .send({ text: 'Test reply to delete', delete_password: 'password', thread_id: thread_id })
          .end(function(err, res) {
            const reply_id = res.body._id;
            chai.request(server)
              .delete('/api/replies/testboard')
              .send({ thread_id: thread_id, reply_id: reply_id, delete_password: 'password' })
              .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'success');
                done();
              });
          });
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/testboard')
      .send({ text: 'Test thread for reply reporting', delete_password: 'password' })
      .end(function(err, res) {
        const thread_id = res.body._id;
        chai.request(server)
          .post('/api/replies/testboard')
          .send({ text: 'Test reply to report', delete_password: 'password', thread_id: thread_id })
          .end(function(err, res) {
            const reply_id = res.body._id;
            chai.request(server)
              .put('/api/replies/testboard')
              .send({ thread_id: thread_id, reply_id: reply_id })
              .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'reported');
                done();
              });
          });
      });
  });

});
