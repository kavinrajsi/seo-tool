"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  SmileIcon, PlusIcon, XIcon, LoaderIcon, CheckIcon,
  BarChart2Icon, UsersIcon, LockIcon, UnlockIcon, TrashIcon,
  ChevronRightIcon, ArrowLeftIcon, MessageSquareIcon,
} from "lucide-react";

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" };
}

const RATING_LABELS = { 1: "Strongly Disagree", 2: "Disagree", 3: "Neutral", 4: "Agree", 5: "Strongly Agree" };
const RATING_COLORS = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#10b981" };

function ScoreBar({ dist, total }) {
  return (
    <div className="space-y-1 mt-2">
      {[5, 4, 3, 2, 1].map((n) => {
        const count = dist[n] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={n} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-right text-muted-foreground shrink-0">{RATING_LABELS[n]}</span>
            <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: RATING_COLORS[n] }} />
            </div>
            <span className="w-8 text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmojiRating({ value, onChange, disabled }) {
  const emojis = [
    { n: 1, icon: "😞", label: "Strongly Disagree" },
    { n: 2, icon: "🙁", label: "Disagree" },
    { n: 3, icon: "😐", label: "Neutral" },
    { n: 4, icon: "🙂", label: "Agree" },
    { n: 5, icon: "😄", label: "Strongly Agree" },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {emojis.map(({ n, icon, label }) => (
        <button key={n} type="button" disabled={disabled}
          onClick={() => onChange?.(n)}
          title={label}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all text-sm ${
            value === n
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-muted/30 hover:bg-muted/60"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
          <span className="text-2xl">{icon}</span>
          <span className="text-[10px] text-muted-foreground leading-tight text-center w-16">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Survey list view ──────────────────────────────────────────────────────────
function SurveyList({ surveys, respondedSet, isAdmin, onOpen, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fAnon, setFAnon] = useState(true);
  const [saving, setSaving] = useState(false);

  async function createSurvey() {
    if (!fTitle.trim()) return;
    setSaving(true);
    const h = await authHeader();
    await fetch("/api/engagement", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "create_survey", title: fTitle, description: fDesc, is_anonymous: fAnon }),
    });
    setSaving(false);
    setShowCreate(false);
    setFTitle(""); setFDesc(""); setFAnon(true);
    onRefresh();
  }

  async function toggleStatus(survey) {
    const h = await authHeader();
    await fetch("/api/engagement", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "toggle_status", survey_id: survey.id, status: survey.status === "active" ? "closed" : "active" }),
    });
    onRefresh();
  }

  async function deleteSurvey(id) {
    if (!confirm("Delete this survey and all responses?")) return;
    const h = await authHeader();
    await fetch("/api/engagement", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "delete_survey", survey_id: id }),
    });
    onRefresh();
  }

  const active = surveys.filter((s) => s.status === "active");
  const closed = surveys.filter((s) => s.status !== "active");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Employee Engagement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Share your thoughts and help us improve the workplace</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
            <PlusIcon size={15} /> New Survey
          </button>
        )}
      </div>

      {surveys.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <SmileIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No surveys yet</p>
          {isAdmin && <p className="text-xs mt-1">Create one to gather team feedback</p>}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p>
          {active.map((s) => {
            const responded = respondedSet.has(s.id);
            return (
              <div key={s.id} className="group border border-border rounded-xl p-4 bg-card hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => onOpen(s)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{s.title}</span>
                      {s.is_anonymous && <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Anonymous</span>}
                      {responded && <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1"><CheckIcon size={9} /> Submitted</span>}
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); toggleStatus(s); }}
                          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors" title="Close survey">
                          <LockIcon size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSurvey(s.id); }}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <TrashIcon size={13} />
                        </button>
                      </>
                    )}
                    <ChevronRightIcon size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Closed</p>
          {closed.map((s) => (
            <div key={s.id} className="group border border-border rounded-xl p-4 bg-card hover:border-primary/30 transition-colors cursor-pointer opacity-60 hover:opacity-100"
              onClick={() => onOpen(s)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{s.title}</span>
                    <span className="text-[10px] bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-1.5 py-0.5 rounded-full">Closed</span>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(s); }}
                        className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors" title="Reopen">
                        <UnlockIcon size={13} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSurvey(s.id); }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <TrashIcon size={13} />
                      </button>
                    </>
                  )}
                  <ChevronRightIcon size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create survey drawer */}
      {showCreate && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowCreate(false)} />
      )}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 transition-transform duration-200 ${showCreate ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">New Survey</h2>
          <button onClick={() => setShowCreate(false)} className="p-1.5 rounded hover:bg-muted/60 transition-colors"><XIcon size={16} /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-57px)]">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title *</label>
            <input value={fTitle} onChange={(e) => setFTitle(e.target.value)}
              placeholder="Q2 2025 Engagement Survey"
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)}
              rows={3} placeholder="Help us understand how you feel about working here..."
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={fAnon} onChange={(e) => setFAnon(e.target.checked)}
              className="rounded border-border accent-primary" />
            <span className="text-sm">Anonymous responses</span>
          </label>
          <p className="text-xs text-muted-foreground -mt-2">When enabled, individual responses won't be attributed to employees.</p>
          <button onClick={createSurvey} disabled={!fTitle.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
            Create Survey
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Survey detail: fill out / results ─────────────────────────────────────────
function SurveyDetail({ survey, questions, myResponses, isAdmin, aggregated, respondentCount, myEmployeeId, onBack, onRefresh }) {
  const hasResponded = myResponses.length > 0;
  const [draft, setDraft] = useState(() => {
    const map = {};
    myResponses.forEach((r) => { map[r.question_id] = { rating: r.rating, comment: r.comment || "" }; });
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(hasResponded);

  // Admin: add question
  const [showAddQ, setShowAddQ] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("rating");
  const [addingQ, setAddingQ] = useState(false);

  async function submitResponses() {
    setSubmitting(true);
    const responses = questions.map((q) => ({
      question_id: q.id,
      rating: draft[q.id]?.rating ?? null,
      comment: draft[q.id]?.comment ?? "",
    }));
    const h = await authHeader();
    await fetch("/api/engagement", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "submit_responses", survey_id: survey.id, responses }),
    });
    setSubmitting(false);
    setSubmitted(true);
    onRefresh();
  }

  async function addQuestion() {
    if (!qText.trim()) return;
    setAddingQ(true);
    const h = await authHeader();
    await fetch("/api/engagement", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "add_question", survey_id: survey.id, question: qText, type: qType }),
    });
    setAddingQ(false);
    setQText(""); setQType("rating"); setShowAddQ(false);
    onRefresh();
  }

  async function deleteQuestion(qid) {
    if (!confirm("Delete this question?")) return;
    const h = await authHeader();
    await fetch("/api/engagement", {
      method: "POST", headers: h,
      body: JSON.stringify({ action: "delete_question", question_id: qid }),
    });
    onRefresh();
  }

  const isClosed = survey.status !== "active";
  const canSubmit = !submitted && !isClosed;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">{survey.title}</h1>
          {survey.description && <p className="text-sm text-muted-foreground mt-0.5">{survey.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {survey.is_anonymous && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full">Anonymous</span>
          )}
          {isClosed && (
            <span className="text-[10px] bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-1 rounded-full">Closed</span>
          )}
          {isAdmin && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-2 py-1">
              <UsersIcon size={12} />
              <span>{respondentCount} responded</span>
            </div>
          )}
        </div>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquareIcon size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No questions yet</p>
          {isAdmin && <p className="text-xs mt-1">Add questions below to get started</p>}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const resp = draft[q.id] ?? { rating: null, comment: "" };
          const agg = aggregated?.find((a) => a.question_id === q.id);
          const avg = agg?.avg ? agg.avg.toFixed(1) : null;

          return (
            <div key={q.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2 flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0">Q{idx + 1}</span>
                  <p className="text-sm font-medium">{q.question}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && avg != null && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                      style={{ color: RATING_COLORS[Math.round(parseFloat(avg))], borderColor: RATING_COLORS[Math.round(parseFloat(avg))] + "40", backgroundColor: RATING_COLORS[Math.round(parseFloat(avg))] + "15" }}>
                      {avg} avg
                    </span>
                  )}
                  {isAdmin && (
                    <button onClick={() => deleteQuestion(q.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                      <TrashIcon size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Employee fill-out */}
              {!isAdmin && (
                <>
                  {q.type === "rating" && (
                    <EmojiRating value={resp.rating} onChange={(v) => setDraft((d) => ({ ...d, [q.id]: { ...resp, rating: v } }))} disabled={!canSubmit} />
                  )}
                  {q.type === "text" && (
                    <textarea value={resp.comment} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: { ...resp, comment: e.target.value } }))}
                      disabled={!canSubmit} rows={3} placeholder="Your thoughts..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none disabled:opacity-60" />
                  )}
                  {q.type === "rating" && canSubmit && (
                    <textarea value={resp.comment} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: { ...resp, comment: e.target.value } }))}
                      rows={2} placeholder="Optional comment..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
                  )}
                  {submitted && resp.rating && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckIcon size={11} className="text-green-400" /> Your response saved</p>
                  )}
                </>
              )}

              {/* Admin results view */}
              {isAdmin && agg && (
                <div>
                  {q.type === "rating" && agg.count > 0 && (
                    <ScoreBar dist={agg.dist} total={agg.count} />
                  )}
                  {agg.comments?.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Comments</p>
                      {agg.comments.map((c, ci) => (
                        <p key={ci} className="text-xs bg-muted/30 border border-border rounded-lg px-3 py-2 italic">"{c}"</p>
                      ))}
                    </div>
                  )}
                  {agg.count === 0 && q.type === "rating" && (
                    <p className="text-xs text-muted-foreground">No responses yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button (employee) */}
      {!isAdmin && questions.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          {submitted ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckIcon size={16} />
              Thank you for your feedback!
            </div>
          ) : isClosed ? (
            <p className="text-sm text-muted-foreground">This survey is closed for responses.</p>
          ) : (
            <button onClick={submitResponses} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {submitting ? <LoaderIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />}
              Submit Feedback
            </button>
          )}
        </div>
      )}

      {/* Add question (admin) */}
      {isAdmin && (
        <div className="border border-dashed border-border rounded-xl p-4">
          {!showAddQ ? (
            <button onClick={() => setShowAddQ(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <PlusIcon size={14} /> Add Question
            </button>
          ) : (
            <div className="space-y-3">
              <textarea value={qText} onChange={(e) => setQText(e.target.value)}
                rows={2} placeholder="e.g. I feel valued at work"
                autoFocus
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
              <div className="flex items-center gap-2">
                <select value={qType} onChange={(e) => setQType(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/60">
                  <option value="rating">Rating (emoji scale)</option>
                  <option value="text">Open text</option>
                </select>
                <button onClick={addQuestion} disabled={!qText.trim() || addingQ}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {addingQ ? <LoaderIcon size={12} className="animate-spin" /> : <PlusIcon size={12} />} Add
                </button>
                <button onClick={() => { setShowAddQ(false); setQText(""); }}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/60 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EngagementPage() {
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState([]);
  const [respondedSet, setRespondedSet] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [openSurvey, setOpenSurvey] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    const h = await authHeader();
    const res = await fetch("/api/engagement", { headers: h });
    const data = await res.json();
    setSurveys(data.surveys ?? []);
    setRespondedSet(new Set(data.responded_surveys ?? []));
    setIsAdmin(data.is_admin ?? false);
    setLoading(false);
  }, []);

  const fetchDetail = useCallback(async (survey) => {
    setDetailLoading(true);
    const h = await authHeader();
    const res = await fetch(`/api/engagement?survey_id=${survey.id}`, { headers: h });
    const data = await res.json();
    setDetail(data);
    setDetailLoading(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  function openSurveyView(s) {
    setOpenSurvey(s);
    fetchDetail(s);
  }

  function handleBack() {
    setOpenSurvey(null);
    setDetail(null);
    fetchList();
  }

  function handleRefresh() {
    if (openSurvey) fetchDetail(openSurvey);
    fetchList();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (openSurvey) {
    if (detailLoading || !detail) {
      return (
        <div className="flex items-center justify-center py-32">
          <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="p-6">
        <SurveyDetail
          survey={detail.survey}
          questions={detail.questions}
          myResponses={detail.my_responses}
          isAdmin={detail.is_admin}
          aggregated={detail.aggregated}
          respondentCount={detail.respondent_count ?? 0}
          myEmployeeId={detail.my_employee_id}
          onBack={handleBack}
          onRefresh={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <SurveyList
        surveys={surveys}
        respondedSet={respondedSet}
        isAdmin={isAdmin}
        onOpen={openSurveyView}
        onRefresh={fetchList}
      />
    </div>
  );
}
