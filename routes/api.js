'use strict';

const mongoose = require('mongoose');

// Define schemas
const replySchema = new mongoose.Schema({
  text: String,
  created_on: { type: Date, default: Date.now },
  delete_password: String,
  reported: { type: Boolean, default: false }
});

const threadSchema = new mongoose.Schema({
  text: String,
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  delete_password: String,
  replies: [replySchema],
  board: String
});

// Create models
const Reply = mongoose.model('Reply', replySchema);
const Thread = mongoose.model('Thread', threadSchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post(async function(req, res) {
      const { text, delete_password } = req.body;
      const board = req.params.board;
      
      const newThread = new Thread({
        text,
        delete_password,
        board
      });

      try {
        const savedThread = await newThread.save();
        res.json(savedThread);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error saving thread' });
      }
    })
    .get(async function(req, res) {
      const board = req.params.board;
      try {
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .select('-reported -delete_password')
          .lean();

        threads.forEach(thread => {
          thread.replies = thread.replies.slice(-3).map(reply => {
            delete reply.reported;
            delete reply.delete_password;
            return reply;
          });
        });

        res.json(threads);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching threads' });
      }
    })
    .delete(async function(req, res) {
      const { thread_id, delete_password } = req.body;
      try {
        if (!mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.status(200).send('incorrect password');
        }
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(200).send('incorrect password');
        }
        if (thread.delete_password !== delete_password) {
          return res.status(200).send('incorrect password');
        }
        await Thread.findByIdAndDelete(thread_id);
        res.status(200).send('success');
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting thread' });
      }
    })
    .put(async function(req, res) {
      const { thread_id } = req.body;
      try {
        if (!mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.status(200).send('reported');
        }
        const thread = await Thread.findByIdAndUpdate(thread_id, { reported: true });
        if (!thread) {
          return res.status(200).send('reported');
        }
        res.status(200).send('reported');
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error reporting thread' });
      }
    });
    
  app.route('/api/replies/:board')
  .post(async function(req, res) {
    const { thread_id, text, delete_password } = req.body;
    const newReply = {
      text,
      delete_password,
      created_on: new Date() // Explicitly set the created_on date
    };
    try {
      if (!mongoose.Types.ObjectId.isValid(thread_id)) {
        return res.status(200).json({});
      }
      const currentDate = new Date();
      const thread = await Thread.findByIdAndUpdate(
        thread_id,
        {
          $push: { replies: newReply },
          bumped_on: currentDate // Use the same date for bumped_on
        },
        { new: true }
      );
      if (!thread) {
        return res.status(200).json({});
      }
      res.json(thread.replies[thread.replies.length - 1]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error adding reply' });
    }
  })
    .get(async function(req, res) {
      const thread_id = req.query.thread_id;
      try {
        if (!mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.status(200).json({});
        }
        const thread = await Thread.findById(thread_id)
          .select('-reported -delete_password')
          .lean();
        
        if (!thread) {
          return res.status(200).json({});
        }

        thread.replies = thread.replies.map(reply => {
          delete reply.reported;
          delete reply.delete_password;
          return reply;
        });

        res.json(thread);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching thread' });
      }
    })
    .delete(async function(req, res) {
      const { thread_id, reply_id, delete_password } = req.body;
      try {
        if (!mongoose.Types.ObjectId.isValid(thread_id) || !mongoose.Types.ObjectId.isValid(reply_id)) {
          return res.status(200).send('incorrect password');
        }
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(200).send('incorrect password');
        }
        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.status(200).send('incorrect password');
        }
        if (reply.delete_password !== delete_password) {
          return res.status(200).send('incorrect password');
        }
        reply.text = '[deleted]';
        await thread.save();
        res.status(200).send('success');
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting reply' });
      }
    })
    .put(async function(req, res) {
      const { thread_id, reply_id } = req.body;
      try {
        if (!mongoose.Types.ObjectId.isValid(thread_id) || !mongoose.Types.ObjectId.isValid(reply_id)) {
          return res.status(200).send('reported');
        }
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(200).send('reported');
        }
        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.status(200).send('reported');
        }
        reply.reported = true;
        await thread.save();
        res.status(200).send('reported');
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error reporting reply' });
      }
    });
};
