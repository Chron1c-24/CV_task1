/*
 * Left sidebar: displays ONLY the task groups, centered vertically and horizontally.
 */

const GROUP_ICONS = {
  "Noise": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <path d="M4 10h2l2-6 4 12 2-6h2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "Low-pass filters": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <circle cx="10" cy="10" r="7" strokeDasharray="3 2" />
      <circle cx="10" cy="10" r="3" fill="currentColor" />
    </svg>
  ),
  "Edge detection": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <rect x="4" y="4" width="12" height="12" rx="2" />
      <path d="M10 4v12M4 10h12" strokeDasharray="2 2" />
    </svg>
  ),
  "Equalization": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <path d="M3 15h14M5 15V9M9 15V5M13 15V11M17 15V7" strokeLinecap="round" />
    </svg>
  ),
  "Normalization": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <path d="M3 10h14M7 6l-4 4 4 4M13 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "RGB": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <circle cx="10" cy="7" r="4" />
      <circle cx="7" cy="13" r="4" />
      <circle cx="13" cy="13" r="4" />
    </svg>
  ),
  "Frequency filters": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <path d="M2 10c2-4 4-4 6 0s4 4 6 0 4-4 4 0" strokeLinecap="round" />
    </svg>
  ),
  "Hybrid images": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="side-icon">
      <rect x="3" y="3" width="9" height="9" rx="1.5" />
      <rect x="8" y="8" width="9" height="9" rx="1.5" strokeDasharray="2 1.5" />
    </svg>
  ),
};

export default function Sidebar({ tasks, activeId, onSelect }) {
  const groups = [...new Set(tasks.map((task) => task.group))];
  const activeTask = tasks.find((t) => t.id === activeId);
  const activeGroup = activeTask?.group;

  const handleGroupSelect = (group) => {
    if (group !== activeGroup) {
      const firstTask = tasks.find((t) => t.group === group);
      if (firstTask) onSelect(firstTask.id);
    }
  };

  return (
    <nav className="sidebar-centered" aria-label="Task Groups">
      <div className="side-group-list">
        {groups.map((group) => {
          const isActive = group === activeGroup;
          return (
            <button
              key={group}
              type="button"
              className={`side-group-btn ${isActive ? "active" : ""}`}
              onClick={() => handleGroupSelect(group)}
            >
              {GROUP_ICONS[group] || (
                <span className="side-icon-bullet">●</span>
              )}
              <span className="side-group-name">{group}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
