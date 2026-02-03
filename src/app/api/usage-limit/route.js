import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    // Get today's date at midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    let count = 0;

    if (user) {
      // For authenticated users, count from usage_logs table
      const { data, error } = await supabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayISO);

      if (!error) {
        count = data || 0;
      }
    } else {
      // For anonymous users, use session storage or cookies
      // This is a simple client-side tracking for demo purposes
      // In production, you might want to track by IP address
      count = 0; // Will be tracked client-side
    }

    return Response.json({ count, date: todayISO });
  } catch (error) {
    console.error('Usage limit error:', error);
    return Response.json({ count: 0 }, { status: 200 });
  }
}
