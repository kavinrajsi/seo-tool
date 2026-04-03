import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");

  const { searchParams } = new URL(req.url);
  const surveyId = searchParams.get("survey_id");

  if (surveyId) {
    // Get survey with questions and responses
    const { data: survey } = await supabase
      .from("engagement_surveys")
      .select("*")
      .eq("id", surveyId)
      .single();
    if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: questions } = await supabase
      .from("engagement_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("position", { ascending: true });

    // My responses
    const { data: myResponses } = await supabase
      .from("engagement_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .eq("employee_id", emp.id);

    // Admin: get aggregated results
    let aggregated = null;
    if (isAdmin) {
      const { data: allResponses } = await supabase
        .from("engagement_responses")
        .select("question_id, rating, comment, employee_id")
        .eq("survey_id", surveyId);

      // Count unique respondents
      const respondentSet = new Set((allResponses ?? []).map((r) => r.employee_id));

      aggregated = (questions ?? []).map((q) => {
        const qResps = (allResponses ?? []).filter((r) => r.question_id === q.id);
        const ratings = qResps.filter((r) => r.rating != null).map((r) => r.rating);
        const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratings.forEach((r) => dist[r]++);
        const comments = survey.is_anonymous ? [] : qResps.filter((r) => r.comment).map((r) => r.comment);
        return { question_id: q.id, avg, dist, count: ratings.length, comments };
      });

      return NextResponse.json({
        survey, questions: questions ?? [],
        my_responses: myResponses ?? [],
        is_admin: true, aggregated, respondent_count: respondentSet.size,
        my_employee_id: emp.id,
      });
    }

    return NextResponse.json({
      survey, questions: questions ?? [],
      my_responses: myResponses ?? [],
      is_admin: false, my_employee_id: emp.id,
    });
  }

  // List all surveys
  const { data: surveys } = await supabase
    .from("engagement_surveys")
    .select("*")
    .order("created_at", { ascending: false });

  // For each survey, count my responses
  const { data: myResponseCounts } = await supabase
    .from("engagement_responses")
    .select("survey_id")
    .eq("employee_id", emp.id);

  const respondedSurveys = new Set((myResponseCounts ?? []).map((r) => r.survey_id));

  return NextResponse.json({
    surveys: surveys ?? [],
    responded_surveys: [...respondedSurveys],
    is_admin: isAdmin,
  });
}

export async function POST(req) {
  const auth = await getUserFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, supabase } = auth;

  const { data: emp } = await supabase
    .from("employees").select("id, role, designation").eq("work_email", user.email).maybeSingle();
  const isAdmin = emp?.role === "admin" || emp?.role === "owner" || emp?.designation?.toLowerCase().includes("hr");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, ...body } = await req.json();

  if (action === "create_survey") {
    const { title, description, is_anonymous = true } = body;
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const { data, error } = await supabase.from("engagement_surveys").insert({
      title: title.trim(), description: description?.trim() || null,
      is_anonymous, status: "active", created_by: emp.id,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, survey: data });
  }

  if (action === "toggle_status") {
    const { survey_id, status } = body;
    await supabase.from("engagement_surveys").update({ status }).eq("id", survey_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_survey") {
    const { survey_id } = body;
    await supabase.from("engagement_surveys").delete().eq("id", survey_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "add_question") {
    const { survey_id, question, type = "rating" } = body;
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });
    const { data: existing } = await supabase
      .from("engagement_questions").select("position").eq("survey_id", survey_id).order("position", { ascending: false }).limit(1);
    const nextPos = (existing?.[0]?.position ?? -1) + 1;
    const { error } = await supabase.from("engagement_questions").insert({
      survey_id, question: question.trim(), type, position: nextPos,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_question") {
    const { question_id } = body;
    await supabase.from("engagement_questions").delete().eq("id", question_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "submit_responses") {
    const { survey_id, responses } = body; // [{question_id, rating, comment}]
    if (!responses?.length) return NextResponse.json({ error: "responses required" }, { status: 400 });

    for (const r of responses) {
      await supabase.from("engagement_responses").upsert({
        survey_id, question_id: r.question_id, employee_id: emp.id,
        rating: r.rating ?? null, comment: r.comment?.trim() || null,
      }, { onConflict: "question_id,employee_id" });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
