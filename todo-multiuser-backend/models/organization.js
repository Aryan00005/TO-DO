const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class Organization {
  static async create(data) {
    const { data: result, error } = await supabase
      .from('organizations')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

module.exports = Organization;