import { useEffect, useState } from "react";
import { base64ToFile } from "./api.js";
import { COMPARE, TASKS, TASK_BY_ID } from "./tasks.js";
import ImageInputs from "./components/ImageInputs.jsx";
import Sidebar from "./components/Sidebar.jsx";
import CompareView from "./views/CompareView.jsx";
import TaskView from "./views/TaskView.jsx";

/* File -> object URL for <img>, revoked when the file changes. */
function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

export default function App() {
  const [taskId, setTaskId] = useState(TASKS[0].id);
  const [tab, setTab] = useState("preview");
  const [images, setImages] = useState([null, null]); // in the order of task.inputs; shared by all tasks
  const urls = [useObjectUrl(images[0]), useObjectUrl(images[1])];

  const task = TASK_BY_ID[taskId];
  const compare = task.compare && COMPARE[task.compare];
  const activeTab = compare ? tab : "preview";

  const groupTasks = TASKS.filter((t) => t.group === task.group);

  const setImage = (index, file) => setImages((prev) => prev.map((f, i) => (i === index ? file : f)));

  return (
    <div className="layout">
      <aside className="side">
        {/* Brand Logo */}
        <div className="brand">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 32 32" fill="none" className="brand-svg">
              <rect width="32" height="32" rx="9" fill="url(#brandGrad)" />
              <circle cx="16" cy="16" r="8" stroke="#ffffff" strokeWidth="2.2" strokeDasharray="3.5 2" />
              <circle cx="16" cy="16" r="4" fill="#ffffff" />
              <path d="M16 4v3M16 25v3M4 16h3M25 16h3" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">
              <span className="brand-cv">CV</span>
              <span className="brand-task">TASK 1</span>
            </span>
            <span className="brand-subtitle">IMAGE PROCESSING</span>
          </div>
        </div>

        {/* Navigation centered in middle */}
        <Sidebar tasks={TASKS} activeId={taskId} onSelect={setTaskId} />

        <div className="side-footer">
          <span className="side-version">CV LAB • V1.0</span>
        </div>
      </aside>

      <main className="app">
        <ImageInputs inputs={task.inputs} urls={urls} onSelect={setImage} />

        {/* Sub-task Operation Selector when a group has multiple tasks */}
        {groupTasks.length > 1 && (
          <div className="subtask-selector">
            <span className="subtask-label">{task.group}:</span>
            <div className="subtask-pills">
              {groupTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`subtask-pill ${t.id === taskId ? "active" : ""}`}
                  onClick={() => setTaskId(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="tabs">
          <button className={activeTab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
            Preview
          </button>
          <button
            className={activeTab === "compare" ? "active" : ""}
            onClick={() => setTab("compare")}
            disabled={!compare}
            title={compare ? "" : "No compare view for this task"}
          >
            Compare
          </button>
        </nav>

        {activeTab === "preview" ? (
          <TaskView
            key={task.id}
            task={task}
            images={images}
            urls={urls}
            beforeSrc={urls[0]}
            onUseAsInput={(png) => setImage(0, base64ToFile(png))}
          />
        ) : (
          <CompareView key={task.compare} compare={compare} images={images} beforeSrc={urls[0]} />
        )}
      </main>
    </div>
  );
}