import { supabase } from '../supabase'

export async function getPlatformFeeRate() {
  const { data, error } = await supabase
    .from('platform_settings').select('fee_rate').eq('id', 1).single()
  if (error || !data) return 0.10
  return Number(data.fee_rate)
}
