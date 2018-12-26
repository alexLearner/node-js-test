const passport = require('passport');
const User = require('../models/User');

exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    res.status(400).json({ message: errors });
    return;
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }

    if (!user) {
      res.status(400).json({ message: info });
      return;
    }

    req.logIn(user, (err) => {
      if (err) { return next(err); }
      res.status(200).json({ user, message: 'Success! You are logged in.' });
    });
  })(req, res, next);
};

exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : Failed to destroy the session during logout.', err);
    req.user = null;
    res.status(200).json({ message: 'Success logout' });
  });
};

exports.postSignup = async (req, res, next) => {
  if (req.user) {
    res.status(400).json({ message: 'You already logged' });
    return;
  }

  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    res.status(400).json({ message: errors });
    return;
  }

  try {
    const { email, password } = req.body;
    const user = new User({ email, password });
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({ message: 'Account with that email address already exists.' });
      return;
    }

    await user.save();

    req.logIn(user, (err) => {
      if (err) { return next(err); }
      res.status(200).json({ user, message: 'Success! You are logged in.' });
    });

  } catch (err) { next(err); }
};
