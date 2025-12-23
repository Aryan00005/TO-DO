const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class User {
  static async create(userData) {
    const { name, email, userId, password, authProvider = 'local', accountStatus = 'active' } = userData;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        user_id: userId,
        password: hashedPassword,
        auth_provider: authProvider,
        account_status: accountStatus
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateById(id, updates) {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, user_id, auth_provider, account_status, created_at')
      .order('name');
    
    if (error) throw error;
    return data;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;