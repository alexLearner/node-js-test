const schedule = require('node-schedule');
const stripe = require('stripe')(process.env.STRIPE_SKEY);
const User = require('../models/User');
const { USER_STATUSES } = require('../models/User');
const mailer = require('../helpers/mailer');

const CHARGE_DEFAULT_AMOUNT = 51;
const CHARGE_DIFF_DAYS = 7;
const CHARGE_TIMEOUT_DAYS = 1;

function chargeUser(user, { amount }) {
  const promises = [];

  user.cards.forEach((cardId) => {
    promises.push(stripe.charges.create({
      amount,
      currency: 'usd',
      customer: user.customer,
      source: cardId,
      description: 'Charge for jenny.rosen@example.com',
    }));
  });

  return Promise
    .all(promises)
    .then(async () => {
      await user.set({ status: { code: USER_STATUSES.SUCCESS } });
      await user.save();

      return user;
    });
}

function createChargeAfter24H(user) {
  const date = new Date();
  date.setDate(date.getDate() + CHARGE_TIMEOUT_DAYS);

  schedule.scheduleJob(date, () => {
    chargeUser(user).catch(() => user.remove());
  });
}


function isCanCharge(user) {
  const { code, date } = user.status;
  const diffDate = Math.floor(new Date() - date) / (60 * 60 * 24 * 1000);

  if (code === USER_STATUSES.SUCCESS || code === USER_STATUSES.FAILED) {
    return diffDate >= CHARGE_DIFF_DAYS;
  }

  return true;
}


exports.postCharge = async (req, res, next) => {
  const { amount = CHARGE_DEFAULT_AMOUNT } = req.body;

  try {
    const users = await User.find({});

    if (!users.length) {
      return res.status(400).json({ message: 'No users yet' });
    }

    await Promise.all(users.map(async (user) => {
      if (!user.cards.length) {
        return user.remove();
      }

      if (!isCanCharge(user)) {
        return;
      }

      try {
        await chargeUser(user, { amount });
      } catch (err) {
        mailer.sendMail({
          to: user.email,
          subject: 'Error during charge',
          message: 'An error occurred during сharge. We will try again in 24 hours',
        });

        createChargeAfter24H(user);
        user.set({ status: { code: USER_STATUSES.FAILED } });
      }
    }));

    res.status(200).json({ message: 'successful сharged' });
  } catch (err) { next(err); }
};
