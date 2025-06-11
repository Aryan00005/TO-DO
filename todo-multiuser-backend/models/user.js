const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    userId: { type: String, required: true, unique: true }, 
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['superior', 'subordinate', 'subsubordinate', 'juniormost', 'superadmin'], 
        default: 'juniormost' 
    }
});

// Prevent OverwriteModelError in dev/hot reload
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
