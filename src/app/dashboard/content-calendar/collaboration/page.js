"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./page.module.css";

const STORAGE_KEY = "content_collab_tasks";

const STATUSES = ["Draft", "In Progress", "Review", "Approved", "Published"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CONTENT_TYPES = [
  "Blog Post",
  "Social Media",
  "Email",
  "Video",
  "Infographic",
  "Landing Page",
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
    draft: styles.badgeDraft,
    in_progress: styles.badgeInProgress,
    review: styles.badgeReview,
    approved: styles.badgeApproved,
    published: styles.badgePublished,
  };
  return `${styles.badge} ${map[statusKey(status)] || styles.badgeDraft}`;
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
  if (!dueDate || status === "Published" || status === "Approved") return false;
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
  content_type: "Blog Post",
  assignee: "",
  due_date: "",
  priority: "Medium",
  status: "Draft",
};

export default function ContentCollaborationPage() {
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Drawer state
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState("");

  // Load tasks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist tasks to localStorage
  const saveTasks = useCallback((newTasks) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const review = tasks.filter((t) => t.status === "Review").length;
    const completed = tasks.filter(
      (t) => t.status === "Approved" || t.status === "Published"
    ).length;
    return { total, inProgress, review, completed };
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
          (t.content_type && t.content_type.toLowerCase().includes(q))
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter(
        (t) => t.priority.toLowerCase() === priorityFilter
      );
    }

    // Sort: urgent first, then by due date
    const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    result = [...result].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

    return result;
  }, [tasks, activeTab, search, priorityFilter]);

  // Open modal for new task
  function openNewTask() {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, due_date: getToday() });
    setShowModal(true);
  }

  // Open modal for editing
  function openEditTask(task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      content_type: task.content_type || "Blog Post",
      assignee: task.assignee || "",
      due_date: task.due_date || "",
      priority: task.priority || "Medium",
      status: task.status || "Draft",
    });
    setShowModal(true);
  }

  // Save task (create or update)
  function handleSaveTask() {
    if (!form.title.trim()) return;

    const now = new Date().toISOString();

    if (editingTask) {
      const updated = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: form.title.trim(),
              description: form.description.trim(),
              content_type: form.content_type,
              assignee: form.assignee.trim(),
              due_date: form.due_date,
              priority: form.priority,
              status: form.status,
              updated_at: now,
            }
          : t
      );
      saveTasks(updated);

      // Update drawer if this task is selected
      if (selectedTask && selectedTask.id === editingTask.id) {
        const updatedTask = updated.find((t) => t.id === editingTask.id);
        setSelectedTask(updatedTask);
      }
    } else {
      const newTask = {
        id: generateId(),
        title: form.title.trim(),
        description: form.description.trim(),
        content_type: form.content_type,
        assignee: form.assignee.trim(),
        due_date: form.due_date,
        priority: form.priority,
        status: form.status,
        comments: [],
        created_at: now,
        updated_at: now,
      };
      saveTasks([newTask, ...tasks]);
    }

    setShowModal(false);
    setEditingTask(null);
  }

  // Delete task
  function handleDeleteTask(taskId) {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
  }

  // Change status from drawer
  function handleStatusChange(taskId, newStatus) {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus, updated_at: now } : t
    );
    saveTasks(updated);
    const updatedTask = updated.find((t) => t.id === taskId);
    setSelectedTask(updatedTask);
  }

  // Add comment
  function handleAddComment(taskId) {
    if (!commentText.trim()) return;
    const now = new Date().toISOString();
    const newComment = {
      id: generateId(),
      author: "You",
      text: commentText.trim(),
      created_at: now,
    };
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, comments: [...(t.comments || []), newComment], updated_at: now }
        : t
    );
    saveTasks(updated);
    const updatedTask = updated.find((t) => t.id === taskId);
    setSelectedTask(updatedTask);
    setCommentText("");
  }

  // Delete comment
  function handleDeleteComment(taskId, commentId) {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            comments: (t.comments || []).filter((c) => c.id !== commentId),
            updated_at: now,
          }
        : t
    );
    saveTasks(updated);
    const updatedTask = updated.find((t) => t.id === taskId);
    setSelectedTask(updatedTask);
  }

  // Open task detail drawer
  function openTaskDrawer(task) {
    setSelectedTask(task);
    setCommentText("");
  }

  return (
    <>
      <h1 className={styles.heading}>Content Collaboration</h1>
      <p className={styles.subheading}>
        Share your content calendar with team members. Assign tasks, set
        deadlines, leave comments, and track content production status together.
      </p>

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
            {stats.review}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed</div>
          <div className={styles.statValue} style={{ color: "var(--color-accent)" }}>
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Task Board Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Task Board</h2>
          <div className={styles.sectionActions}>
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

        {/* Status Tabs */}
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

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search tasks by title, assignee, or type..."
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

        {/* Task Cards Grid */}
        {filteredTasks.length === 0 ? (
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
        ) : (
          <div className={styles.taskGrid}>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`${styles.taskCard} ${taskCardPriorityClass(task.priority)}`}
                onClick={() => openTaskDrawer(task)}
              >
                <div className={styles.taskCardHeader}>
                  <h3 className={styles.taskCardTitle}>{task.title}</h3>
                  <span className={statusBadgeClass(task.status)}>
                    {task.status}
                  </span>
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
                    <span className={styles.typeBadge}>{task.content_type}</span>
                    <span className={priorityBadgeClass(task.priority)}>
                      {task.priority}
                    </span>
                  </div>
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
            ))}
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
                    {selectedTask.content_type}
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

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>Content Type</label>
                    <select
                      className={styles.select}
                      value={form.content_type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          content_type: e.target.value,
                        }))
                      }
                    >
                      {CONTENT_TYPES.map((ct) => (
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
