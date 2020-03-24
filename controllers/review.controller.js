const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  const review = new Review({
    author: req.user._id,
    store: req.params.id,
    ...req.body
  });
  const savedReview = await review.save();
  req.flash('success', 'Review saved');
  res.redirect('back');
};
