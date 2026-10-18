import { useState } from "react";

/* Left menu: one collapsible section per task group. */
export default function Sidebar({ tasks, activeId, onSelect }) {
  const groups = [...new Set(tasks.map((task) => task.group))];
  const activeGroup = tasks.find((task) => task.id === activeId)?.group;

  // open = set of group names that are expanded. Starts with the active group open.
  const [open, setOpen] = useState(() => new Set([activeGroup]));

  function toggle(group) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  return (
    <nav className="sidebar" aria-label="Tasks">
      {groups.map((group) => {
        const isOpen = open.has(group);
        return (
          <div key={group} className="side-group">
            <button
              className={"side-head" + (group === activeGroup ? " has-active" : "")}
              onClick={() => toggle(group)}
              aria-expanded={isOpen}
            >
              <span className="side-arrow">{isOpen ? "▾" : "▸"}</span>
              {group}
            </button>
            {isOpen && (
              <ul className="side-items">
                {tasks.filter((task) => task.group === group).map((task) => (
                  <li key={task.id}>
                    <button
                      className={"side-item" + (task.id === activeId ? " active" : "")}
                      onClick={() => onSelect(task.id)}
                    >
                      {task.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
