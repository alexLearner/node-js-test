const bcrypt = require('bcrypt-nodejs');
const mongoose = require('mongoose');

const USER_STATUSES = {
  NONE: 'NONE',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,

  cards: { type: [String] },

  status: {
    date: { type: Date, default: Date.now },
    code: { type: String, enum: Object.values(USER_STATUSES), default: USER_STATUSES.NONE },
  },

  customer: String,
}, { timestamps: true });

userSchema.pre('save', function save(next) {
  const user = this;
  if (!user.isModified('password')) { return next(); }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) { return next(err); }
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) { return next(err); }
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.USER_STATUSES = USER_STATUSES;
