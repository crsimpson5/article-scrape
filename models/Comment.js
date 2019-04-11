const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;