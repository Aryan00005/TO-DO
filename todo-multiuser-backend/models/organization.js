const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['company', 'individual'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);