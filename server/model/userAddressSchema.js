const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Address Schema
const AddressSchema = new Schema({
  place: {
    type: String,
    enum: ['home', 'work'],
    required: true
  },
  houseNumber: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  zipcode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  landmark: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

// User Address Schema
const UserAddressSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addresses: [AddressSchema]
});

module.exports = mongoose.model('UserAddress', UserAddressSchema);
