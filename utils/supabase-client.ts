import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const URL = process.env.DATABASE_URL || process.env.SUPABASE_URL;
const API_KEY = process.env.DATABASE_API_KEY || process.env.SUPABASE_API_KEY;

console.log('URL', URL);
console.log('API_KEY', API_KEY);
if (!URL || !API_KEY) {
  throw new Error('Database url or api key vars missing');
}

export const supabase = createClient(URL, API_KEY);
