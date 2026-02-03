import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const metric = await request.json();

    // Log the web vital metric
    console.log('Web Vital received:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });

    // Here you can:
    // 1. Store metrics in your database
    // 2. Send to external analytics (Google Analytics, Vercel Analytics, etc.)
    // 3. Aggregate and display in your dashboard

    // Example: Store in Supabase (optional)
    // const supabase = createClient();
    // await supabase.from('web_vitals').insert({
    //   metric_name: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    //   metric_id: metric.id,
    //   navigation_type: metric.navigationType,
    //   created_at: new Date().toISOString(),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
