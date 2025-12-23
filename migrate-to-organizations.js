const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/todoapp');

// Define schemas
const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['company', 'individual'], required: true },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['superior', 'subordinate', 'subsubordinate', 'juniormost', 'superadmin'], 
    default: 'juniormost' 
  },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  isOrgAdmin: { type: Boolean, default: false }
});

const Organization = mongoose.model('Organization', organizationSchema);
const User = mongoose.model('User', userSchema);

async function migrate() {
  try {
    console.log('🚀 Starting migration...');

    // Create default organizations
    const rlaOrg = await Organization.findOneAndUpdate(
      { name: 'RLA' },
      { name: 'RLA', type: 'company' },
      { upsert: true, new: true }
    );

    const testCorpOrg = await Organization.findOneAndUpdate(
      { name: 'TestCorp' },
      { name: 'TestCorp', type: 'company' },
      { upsert: true, new: true }
    );

    console.log('✅ Organizations created:', rlaOrg.name, testCorpOrg.name);

    // Update existing users
    const jayrajUpdate = await User.findOneAndUpdate(
      { userId: 'jayraj' },
      { 
        organizationId: rlaOrg._id,
        isOrgAdmin: true,
        role: 'superior'
      },
      { new: true }
    );

    const testAdminUpdate = await User.findOneAndUpdate(
      { userId: 'testadmin' },
      { 
        organizationId: testCorpOrg._id,
        isOrgAdmin: true,
        role: 'superior'
      },
      { new: true }
    );

    console.log('✅ Users updated:');
    console.log('- jayraj:', jayrajUpdate ? 'SUCCESS' : 'NOT FOUND');
    console.log('- testadmin:', testAdminUpdate ? 'SUCCESS' : 'NOT FOUND');

    // Create testadmin user if it doesn't exist
    if (!testAdminUpdate) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const newTestAdmin = new User({
        name: 'Test Admin',
        userId: 'testadmin',
        email: 'testadmin@testcorp.com',
        password: hashedPassword,
        role: 'superior',
        organizationId: testCorpOrg._id,
        isOrgAdmin: true
      });
      
      await newTestAdmin.save();
      console.log('✅ Created testadmin user');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();