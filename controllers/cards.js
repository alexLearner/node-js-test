const stripe = require('stripe')(process.env.STRIPE_SKEY);
const schedule = require('node-schedule');
const User = require('../models/User');

exports.getCards = async (req, res, next) => {
  try {
    res.status(200).json({ cards: req.user.cards });
  } catch (err) { next(err); }
};

exports.initCron = () => {
  schedule.scheduleJob('* * 01 * * *', async () => {
    const users = await User.find({});
    users.forEach((user) => {
      if (!user.cards.length) {
        user.remove();
      }
    });
  });
};

exports.postCards = async (req, res, next) => {
  const { user } = req;

  req.assert('number', 'Card number is not valid').len(16);
  req.assert('number', 'Card number must be numeric').isNumeric();
  req.assert('exp_month', 'Exp month is not valid').len(2);
  req.assert('exp_month', 'Exp month must be numeric').isNumeric();
  req.assert('exp_year', 'Exp year is not valid').len(4);
  req.assert('exp_year', 'Exp month must be numeric').isNumeric();
  req.assert('cvc', 'CVC is not valid').len(3);
  req.assert('cvc', 'CVC month must be numeric').isNumeric();

  const errors = req.validationErrors();

  if (errors) {
    res.status(400).json({ message: errors });
    return;
  }

  try {
    const card = {
      number: req.body.number,
      exp_month: req.body.exp_month,
      exp_year: req.body.exp_year,
      cvc: req.body.cvc,
    };

    const token = await stripe.tokens.create({ card });

    let customerId;
    if (!user.customer) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    } else {
      customerId = user.customer;
    }

    const newCard = await stripe.customers.createSource(customerId, { source: token.id });

    await User.updateOne({ _id: user._id },
      {
        $push: { cards: newCard.id },
        $set: { customer: customerId },
      });

    res.status(200).json({ message: 'Card was successful added' });
  } catch (err) { next(err); }
};

const validateIsUserHaveCard = (req, res, next) => {
  const token = req.params.id;

  if (!req.user.cards.includes(token)) {
    res.status(400).json({ message: 'You have not this card' });
    return;
  }

  next();
};

exports.putCard = [
  validateIsUserHaveCard,
  async (req, res, next) => {
    const token = req.params.id;
    const customerId = req.user.customer;
    const { body } = req;

    if (Object.keys(body).length === 0) {
      res.status(400).json({ message: 'Body must not be empty' });
      return;
    }

    try {
      await stripe.customers.updateCard(customerId, token, body);
      res.status(200).json({ message: 'Card was successful changed' });
    } catch (err) { next(err); }
  }
];

exports.deleteCard = [
  validateIsUserHaveCard,
  async (req, res, next) => {
    const token = req.params.id;
    const customerId = req.user.customer;
    const { user } = req;

    try {
      await stripe.customers.deleteCard(customerId, token);
      await user.cards.pull(token);
      await user.save();
      res.status(200).json({ message: 'Card was successful deleted' });
    } catch (err) { next(err); }
  }
];
