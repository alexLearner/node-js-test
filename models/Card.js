const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  token: { type: String, required: true },
}, { timestamps: true });


const Card = mongoose.model('Card', cardSchema);

module.exports.model = Card;
module.exports.schema = cardSchema;
