const mongoose = require('mongoose');
const passport = require('passport');
const crypto = require('crypto');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail.handler');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: "You're now logged in"
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  // First check if the user is authenticated
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Ups. You must be logged in');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  //1. Check if user with that email exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    req.flash('error', 'No account with that email exists');
    return res.redirect('/login');
  }

  //2. Set reset tokens and expiry on the account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // One hour from now
  await user.save();

  //3. Send them an email with the token
  const resetUrl = `${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password reset',
    resetUrl,
    filename: 'password-reset'
  });
  //4. Redirect to login page
  req.flash(
    'success',
    `You have been emailed a password reset link. ${resetUrl}`
  );
  res.redirect('/login');
  user;
};

exports.reset = async (req, res) => {
  //1. Find user with that token and check it's not expired
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Reset token is invalid of has expired');
    return res.redirect('/login');
  }
  // If there is a user, show the reset password form
  res.render('reset', { title: 'Reset your password' });
};

exports.confirmPasswords = (req, res, next) => {
  req.checkBody('password', 'Password cannot be blank!').notEmpty();
  req
    .checkBody('password-confirm', 'Password confirm cannot be blank!')
    .notEmpty();
  req
    .checkBody('password-confirm', 'Your password did not match')
    .equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash(
      'error',
      errors.map(error => error.msg)
    );
    return res.render('reset', {
      title: 'Reset password',
      flashes: req.flash()
    });
  }
  next();
};

exports.update = async (req, res) => {
  //1. Find user with that token and check it's not expired
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Reset token is invalid of has expired');
    return res.redirect('/login');
  }
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', "Your password has been reset!. You're now logged in");
  res.redirect('/');
};
