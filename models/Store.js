const mongoose = require('mongoose');
const slug = require('slugs');

const StoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: 'Please enter a store name'
    },
    slug: String,
    description: {
      type: String,
      trim: true
    },
    tags: {
      type: [String]
    },
    created: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: [
        {
          type: Number,
          required: 'You must suply coordinates!'
        }
      ],
      address: {
        type: String,
        required: 'Must supply an address'
      }
    },
    photo: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: 'You must suply an author'
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
StoreSchema.index({
  name: 'text',
  description: 'text'
});
StoreSchema.index({
  location: '2dsphere'
});
StoreSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    return next();
  }
  this.slug = slug(this.name);
  // Find other stores that have the same slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (slugRegEx) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1} `;
  }
  next();
});

StoreSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Find reviews where the stores _id property === review store property
StoreSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', // Which field on the store
  foreignField: 'store' //Which field on the review
});

StoreSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup stores and populate their reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews'
      }
    },
    // filter for only items that have 2 or more reviews
    { $match: { 'reviews.1': { $exists: true } } },
    // Add the average reviews field
    {
      $addFields: {
        /*  photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews', */
        averageRating: { $avg: '$reviews.rating' }
      }
    },
    // Sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 } },

    // limit to at most 10
    { $limit: 10 }
  ]);
};
function autopopulate(next) {
  this.populate('reviews');
  next();
}
StoreSchema.pre('find', autopopulate);
StoreSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', StoreSchema);
