"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import styles from "./page.module.css";

const STATUSES = ["To Do", "In Progress", "In Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES = [
  "General",
  "Bug",
  "Feature",
  "Content",
  "Design",
  "Marketing",
  "Other",
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

function statusBadgeClass(status) {
  const map = {
    to_do: styles.badgeToDo,
    in_progress: styles.badgeInProgress,
    in_review: styles.badgeInReview,
    done: styles.badgeDone,
  };
  return `${styles.badge} ${map[statusKey(status)] || styles.badgeToDo}`;
}

function priorityBadgeClass(priority) {
  const map = {
    low: styles.priorityLow,
    medium: styles.priorityMedium,
    high: styles.priorityHigh,
    urgent: styles.priorityUrgent,
  };
  return `${styles.priorityBadge} ${map[priority.toLowerCase()] || styles.priorityLow}`;
}

function taskCardPriorityClass(priority) {
  const map = {
    low: styles.taskCardLow,
    medium: styles.taskCardMedium,
    high: styles.taskCardHigh,
    urgent: styles.taskCardUrgent,
  };
  return map[priority.toLowerCase()] || "";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === "Done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return due < today;
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "General",
  assignee: "",
  due_date: "",
  priority: "Medium",
  status: "To Do",
  link: "",
};

function ChecklistProgress({ checklist }) {
  if (!checklist || checklist.length === 0) return null;
  const done = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const pct = Math.round((done / total) * 100);
  return (
    <span className={styles.checklistProgress}>
      <svg
        className={styles.checklistIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      {done}/{total}
      <span className={styles.checklistBar}>
        <span className={styles.checklistBarFill} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {(() => {
        const s = {
          background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: "8px",
        };
        const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
        return (
          <>
            <div style={b("180px", "28px", "0.5rem")} />
            <div style={b("320px", "16px", "2rem")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ ...s, height: "80px", borderRadius: "12px" }} />
              ))}
            </div>
            <div style={{ ...s, height: "48px", borderRadius: "12px", marginBottom: "1rem" }} />
            <div style={{ ...s, height: "44px", borderRadius: "8px", marginBottom: "1rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ ...s, height: "140px", borderRadius: "12px" }} />
              ))}
            </div>
          </>
        );
      })()}
    </>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // "list" | "card" | "board"
  const [sortField, setSortField] = useState("priority");
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Drawer state
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");

  const fetchControllerRef = useRef(null);

  // Load tasks from API
  const fetchTasks = useCallback(async () => {
    if (fetchControllerRef.current) fetchControllerRef.current.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    try {
      const res = await fetch("/api/tasks", { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      setTasks(json.tasks || []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching tasks:", err);
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    return () => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
    };
  }, [fetchTasks]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const inReview = tasks.filter((t) => t.status === "In Review").length;
    const completed = tasks.filter((t) => t.status === "Done").length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
    return { total, inProgress, inReview, completed, overdue };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Tab filter
    if (activeTab !== "All") {
      result = result.filter((t) => t.status === activeTab);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.assignee && t.assignee.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter(
        (t) => t.priority.toLowerCase() === priorityFilter
      );
    }

    // Sort
    const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const statusOrder = { "To Do": 0, "In Progress": 1, "In Review": 2, "Done": 3 };
    const dir = sortDir === "asc" ? 1 : -1;

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = (a.title || "").localeCompare(b.title || "");
          break;
        case "status":
          cmp = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
          break;
        case "priority":
          cmp = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
          break;
        case "due_date":
          if (a.due_date && b.due_date) cmp = a.due_date.localeCompare(b.due_date);
          else if (a.due_date) cmp = -1;
          else if (b.due_date) cmp = 1;
          break;
        case "assignee":
          cmp = (a.assignee || "").localeCompare(b.assignee || "");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        default:
          cmp = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      }
      return cmp * dir;
    });

    return result;
  }, [tasks, activeTab, search, priorityFilter, sortField, sortDir]);

  // Open modal for new task
  function openNewTask() {
    setEditingTask(null);
    setForm({
      ...EMPTY_FORM,
      due_date: getToday(),
    });
    setShowModal(true);
  }

  // Open modal for editing
  function openEditTask(task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      category: task.category || "General",
      assignee: task.assignee || "",
      due_date: task.due_date || "",
      priority: task.priority || "Medium",
      status: task.status || "To Do",
      link: task.link || "",
    });
    setShowModal(true);
  }

  // Save task (create or update)
  async function handleSaveTask() {
    if (!form.title.trim()) return;

    if (editingTask) {
      try {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            assignee: form.assignee.trim(),
            due_date: form.due_date || null,
            priority: form.priority,
            status: form.status,
            link: form.link.trim() || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update task");
        const updatedTask = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updatedTask : t)));
        if (selectedTask && selectedTask.id === editingTask.id) {
          setSelectedTask(updatedTask);
        }
      } catch (err) {
        console.error("Error updating task:", err);
      }
    } else {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            assignee: form.assignee.trim(),
            due_date: form.due_date || null,
            priority: form.priority,
            status: form.status,
            link: form.link.trim() || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to create task");
        const newTask = await res.json();
        setTasks((prev) => [newTask, ...prev]);
      } catch (err) {
        console.error("Error creating task:", err);
      }
    }

    setShowModal(false);
    setEditingTask(null);
  }

  // Delete task
  async function handleDeleteTask(taskId) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  }

  // Change status from drawer or kanban
  async function handleStatusChange(taskId, newStatus) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  }

  // Helper to PATCH checklist/comments and update local state
  async function patchTaskField(taskId, updates) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updatedTask);
      }
      return updatedTask;
    } catch (err) {
      console.error("Error updating task:", err);
      return null;
    }
  }

  // Checklist management
  async function handleAddChecklistItem(taskId) {
    if (!newChecklistText.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newItem = { id: generateId(), text: newChecklistText.trim(), done: false };
    const newChecklist = [...(task.checklist || []), newItem];
    await patchTaskField(taskId, { checklist: newChecklist });
    setNewChecklistText("");
  }

  async function handleToggleChecklistItem(taskId, itemId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newChecklist = (task.checklist || []).map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );
    await patchTaskField(taskId, { checklist: newChecklist });
  }

  async function handleDeleteChecklistItem(taskId, itemId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newChecklist = (task.checklist || []).filter((c) => c.id !== itemId);
    await patchTaskField(taskId, { checklist: newChecklist });
  }

  // Add comment
  async function handleAddComment(taskId) {
    if (!commentText.trim()) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newComment = {
      id: generateId(),
      author: "You",
      text: commentText.trim(),
      created_at: new Date().toISOString(),
    };
    const newComments = [...(task.comments || []), newComment];
    await patchTaskField(taskId, { comments: newComments });
    setCommentText("");
  }

  // Delete comment
  async function handleDeleteComment(taskId, commentId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newComments = (task.comments || []).filter((c) => c.id !== commentId);
    await patchTaskField(taskId, { comments: newComments });
  }

  // Open task detail drawer
  function openTaskDrawer(task) {
    setSelectedTask(task);
    setCommentText("");
    setNewChecklistText("");
  }

  // Sort toggle for list view headers
  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Sort arrow icon
  function SortIcon({ field }) {
    const active = sortField === field;
    return (
      <svg
        className={`${styles.taskListSortIcon} ${active ? styles.taskListSortIconActive : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {sortDir === "desc" && active ? (
          <path d="M12 5v14M5 12l7 7 7-7" />
        ) : (
          <path d="M12 19V5M5 12l7-7 7 7" />
        )}
      </svg>
    );
  }

  // Render task card (shared by card and board view)
  function renderTaskCard(task) {
    return (
      <div
        key={task.id}
        className={styles.taskCard}
        onClick={() => openTaskDrawer(task)}
      >
        <div className={styles.taskCardHeader}>
          <h3 className={styles.taskCardTitle}>{task.title}</h3>
          {viewMode === "card" && (
            <span className={statusBadgeClass(task.status)}>
              {task.status}
            </span>
          )}
        </div>

        {(task.assignee || task.due_date) && (
          <div className={styles.taskCardMeta}>
            {task.assignee && (
              <span className={styles.taskCardAssignee}>
                <svg
                  className={styles.taskCardAssigneeIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {task.assignee}
              </span>
            )}
            {task.due_date && (
              <span
                className={`${styles.taskCardDueDate} ${isOverdue(task.due_date, task.status) ? styles.taskCardOverdue : ""}`}
              >
                <svg
                  className={styles.taskCardDueDateIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        )}

        <div className={styles.taskCardBottom}>
          <div className={styles.taskCardBadges}>
            <span className={styles.typeBadge}>{task.category || "General"}</span>
            <span className={priorityBadgeClass(task.priority)}>
              {task.priority}
            </span>
          </div>
          <div className={styles.taskCardIndicators}>
            <ChecklistProgress checklist={task.checklist} />
            {(task.comments || []).length > 0 && (
              <span className={styles.commentCount}>
                <svg
                  className={styles.commentCountIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {task.comments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return <LoadingSkeleton />;
  }

  return (
    <>
      <h1 className={styles.heading}>Tasks</h1>
      <p className={styles.subheading}>
        Manage your tasks. Assign work, set deadlines, leave comments, and track
        progress together.
      </p>

      {/* Dashboard Section */}
      <div className={styles.dashboard}>
        <div className={styles.dashboardTop}>
          {stats.total > 0 && (
            <div className={styles.dashboardProgress}>
              <div className={styles.dashboardProgressInfo}>
                <span className={styles.dashboardProgressLabel}>Completion</span>
                <span className={styles.dashboardProgressPct}>
                  {Math.round((stats.completed / stats.total) * 100)}%
                </span>
              </div>
              <div className={styles.dashboardProgressBar}>
                <div
                  className={styles.dashboardProgressBarFill}
                  style={{ width: `${Math.round((stats.completed / stats.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Tasks</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>In Progress</div>
            <div className={styles.statValue} style={{ color: "#3b82f6" }}>
              {stats.inProgress}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>In Review</div>
            <div className={styles.statValue} style={{ color: "#ffaa00" }}>
              {stats.inReview}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Completed</div>
            <div className={styles.statValue} style={{ color: "var(--color-accent)" }}>
              {stats.completed}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Overdue</div>
            <div className={styles.statValue} style={{ color: "var(--color-critical)" }}>
              {stats.overdue}
            </div>
          </div>
        </div>
      </div>

      {/* Task Board Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Task Board</h2>
          <div className={styles.sectionActions}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === "list" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === "card" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("card")}
                title="Card view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${viewMode === "board" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("board")}
                title="Board view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="12" rx="1" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={openNewTask}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Task
            </button>
          </div>
        </div>

        {/* Status Tabs (list and card views) */}
        {viewMode !== "board" && (
          <div className={styles.statusTabs}>
            {["All", ...STATUSES].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.statusTab} ${activeTab === tab ? styles.statusTabActive : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === "All" && tasks.length > 0 && ` (${tasks.length})`}
                {tab !== "All" &&
                  tasks.filter((t) => t.status === tab).length > 0 &&
                  ` (${tasks.filter((t) => t.status === tab).length})`}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search tasks by title, assignee, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p.toLowerCase()}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Board View */}
        {viewMode === "board" ? (
          <div className={styles.kanbanBoard}>
            {STATUSES.map((status) => {
              const columnTasks = filteredTasks.filter((t) => t.status === status);
              return (
                <div key={status} className={styles.kanbanColumn}>
                  <div className={styles.kanbanColumnHeader}>
                    <span className={`${styles.kanbanColumnDot} ${styles[`kanbanDot${statusKey(status)}`]}`} />
                    <span className={styles.kanbanColumnTitle}>{status}</span>
                    <span className={styles.kanbanColumnCount}>{columnTasks.length}</span>
                  </div>
                  <div className={styles.kanbanColumnBody}>
                    {columnTasks.length === 0 ? (
                      <div className={styles.kanbanEmpty}>No tasks</div>
                    ) : (
                      columnTasks.map((task) => renderTaskCard(task))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              className={styles.emptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <div className={styles.emptyText}>No tasks found</div>
            <div className={styles.emptySubtext}>
              {tasks.length === 0
                ? "Create your first task to get started."
                : "Try adjusting your search or filters."}
            </div>
          </div>
        ) : viewMode === "list" ? (
          /* Compact List View */
          <div className={styles.taskList}>
            <div className={styles.taskListHeader}>
              <span className={`${styles.taskListHeaderCell} ${sortField === "title" ? styles.taskListHeaderCellActive : ""}`} onClick={() => handleSort("title")}>
                Title <SortIcon field="title" />
              </span>
              <span className={`${styles.taskListHeaderCell} ${sortField === "status" ? styles.taskListHeaderCellActive : ""}`} onClick={() => handleSort("status")}>
                Status <SortIcon field="status" />
              </span>
              <span className={`${styles.taskListHeaderCell} ${sortField === "priority" ? styles.taskListHeaderCellActive : ""}`} onClick={() => handleSort("priority")}>
                Priority <SortIcon field="priority" />
              </span>
              <span className={`${styles.taskListHeaderCell} ${sortField === "due_date" ? styles.taskListHeaderCellActive : ""}`} onClick={() => handleSort("due_date")}>
                Due Date <SortIcon field="due_date" />
              </span>
              <span className={`${styles.taskListHeaderCell} ${sortField === "assignee" ? styles.taskListHeaderCellActive : ""}`} onClick={() => handleSort("assignee")}>
                Assignee <SortIcon field="assignee" />
              </span>
              <span className={`${styles.taskListHeaderCell} ${sortField === "category" ? styles.taskListHeaderCellActive : ""}`} onClick={() => handleSort("category")}>
                Category <SortIcon field="category" />
              </span>
            </div>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={styles.taskListRow}
                onClick={() => openTaskDrawer(task)}
              >
                <div style={{ minWidth: 0 }}>
                  <span className={styles.taskListTitle}>{task.title}</span>
                  {task.link && (
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.taskListLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {task.link}
                    </a>
                  )}
                </div>
                <span className={statusBadgeClass(task.status)}>{task.status}</span>
                <span className={priorityBadgeClass(task.priority)}>{task.priority}</span>
                <span className={`${styles.taskListDate} ${isOverdue(task.due_date, task.status) ? styles.taskListDateOverdue : ""}`}>
                  {task.due_date ? formatDate(task.due_date) : "—"}
                </span>
                <span className={styles.taskListAssignee}>{task.assignee || "—"}</span>
                <span className={styles.typeBadge}>{task.category || "General"}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Card View */
          <div className={styles.taskGrid}>
            {filteredTasks.map((task) => renderTaskCard(task))}
          </div>
        )}
      </div>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <>
          <div
            className={styles.drawerOverlay}
            onClick={() => setSelectedTask(null)}
          />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>Task Details</h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditTask(selectedTask);
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(selectedTask.id);
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
                <button
                  type="button"
                  className={styles.drawerClose}
                  onClick={() => setSelectedTask(null)}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              {/* Title and Status */}
              <div className={styles.drawerSection}>
                <h3 style={{ color: "var(--color-text)", margin: "0 0 0.75rem", fontSize: "1.125rem", fontWeight: 600 }}>
                  {selectedTask.title}
                </h3>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  <span className={statusBadgeClass(selectedTask.status)}>
                    {selectedTask.status}
                  </span>
                  <span className={priorityBadgeClass(selectedTask.priority)}>
                    {selectedTask.priority}
                  </span>
                  <span className={styles.typeBadge}>
                    {selectedTask.category || "General"}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Details</div>
                {selectedTask.description && (
                  <div className={styles.drawerField}>
                    <div className={styles.drawerFieldLabel}>Description</div>
                    <div className={styles.drawerFieldValue}>
                      {selectedTask.description}
                    </div>
                  </div>
                )}
                {selectedTask.link && (
                  <div className={styles.drawerField}>
                    <div className={styles.drawerFieldLabel}>Link</div>
                    <div className={styles.drawerFieldValue}>
                      <a href={selectedTask.link} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>
                        {selectedTask.link}
                      </a>
                    </div>
                  </div>
                )}
                {selectedTask.assignee && (
                  <div className={styles.drawerField}>
                    <div className={styles.drawerFieldLabel}>Assignee</div>
                    <div className={styles.drawerFieldValue}>
                      {selectedTask.assignee}
                    </div>
                  </div>
                )}
                {selectedTask.due_date && (
                  <div className={styles.drawerField}>
                    <div className={styles.drawerFieldLabel}>Due Date</div>
                    <div
                      className={styles.drawerFieldValue}
                      style={
                        isOverdue(selectedTask.due_date, selectedTask.status)
                          ? { color: "var(--color-critical)" }
                          : undefined
                      }
                    >
                      {formatDate(selectedTask.due_date)}
                      {isOverdue(selectedTask.due_date, selectedTask.status) &&
                        " (Overdue)"}
                    </div>
                  </div>
                )}
                <div className={styles.drawerField}>
                  <div className={styles.drawerFieldLabel}>Created</div>
                  <div className={styles.drawerFieldValue}>
                    {formatTimestamp(selectedTask.created_at)}
                  </div>
                </div>
                {selectedTask.updated_at !== selectedTask.created_at && (
                  <div className={styles.drawerField}>
                    <div className={styles.drawerFieldLabel}>Last Updated</div>
                    <div className={styles.drawerFieldValue}>
                      {formatTimestamp(selectedTask.updated_at)}
                    </div>
                  </div>
                )}
              </div>

              {/* Checklist Section */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>
                  Checklist ({(selectedTask.checklist || []).filter((c) => c.done).length}/{(selectedTask.checklist || []).length})
                </div>

                {(selectedTask.checklist || []).length > 0 && (
                  <div className={styles.checklistList}>
                    {(selectedTask.checklist || []).map((item) => (
                      <div key={item.id} className={styles.checklistItem}>
                        <label className={styles.checklistLabel}>
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => handleToggleChecklistItem(selectedTask.id, item.id)}
                            className={styles.checklistCheckbox}
                          />
                          <span className={item.done ? styles.checklistTextDone : styles.checklistText}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          className={styles.commentDeleteBtn}
                          onClick={() => handleDeleteChecklistItem(selectedTask.id, item.id)}
                          title="Remove item"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.checklistAddRow}>
                  <input
                    type="text"
                    className={styles.checklistAddInput}
                    placeholder="Add checklist item..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddChecklistItem(selectedTask.id);
                    }}
                  />
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ padding: "0.375rem 0.625rem", fontSize: "0.8rem" }}
                    onClick={() => handleAddChecklistItem(selectedTask.id)}
                    disabled={!newChecklistText.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Status Change Buttons */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>Change Status</div>
                <div className={styles.drawerStatusButtons}>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.statusBtn} ${selectedTask.status === s ? styles.statusBtnActive : ""}`}
                      onClick={() =>
                        handleStatusChange(selectedTask.id, s)
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Section */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>
                  Comments ({(selectedTask.comments || []).length})
                </div>

                {(selectedTask.comments || []).length > 0 && (
                  <div className={styles.commentList}>
                    {(selectedTask.comments || []).map((comment) => (
                      <div key={comment.id} className={styles.comment}>
                        <div className={styles.commentHeader}>
                          <span className={styles.commentAuthor}>
                            {comment.author}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <span className={styles.commentTime}>
                              {formatTimestamp(comment.created_at)}
                            </span>
                            <button
                              type="button"
                              className={styles.commentDeleteBtn}
                              onClick={() =>
                                handleDeleteComment(
                                  selectedTask.id,
                                  comment.id
                                )
                              }
                              title="Delete comment"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className={styles.commentText}>
                          {comment.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.commentForm}>
                  <textarea
                    className={styles.commentTextarea}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className={styles.commentFormActions}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ padding: "0.375rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={() => handleAddComment(selectedTask.id)}
                      disabled={!commentText.trim()}
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Task Form Modal */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingTask ? "Edit Task" : "New Task"}
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Title <span style={{ color: "var(--color-critical)" }}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Task title"
                    autoFocus
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe the task..."
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Link</label>
                  <input
                    className={styles.input}
                    type="url"
                    value={form.link}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, link: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Category</label>
                    <select
                      className={styles.select}
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          category: e.target.value,
                        }))
                      }
                    >
                      {CATEGORIES.map((ct) => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Assignee</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={form.assignee}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          assignee: e.target.value,
                        }))
                      }
                      placeholder="Name"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Due Date</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={form.due_date}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          due_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Priority</label>
                    <select
                      className={styles.select}
                      value={form.priority}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          priority: e.target.value,
                        }))
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value,
                      }))
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSaveTask}
                disabled={!form.title.trim()}
              >
                {editingTask ? "Update Task" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
