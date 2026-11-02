import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabasePublishableKey } from "@/config/environment";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
