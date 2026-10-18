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

  const setImage = (index, file) => setImages((prev) => prev.map((f, i) => (i === index ? file : f)));

  return (
   <div className="layout">
     <aside className="side">
       <h1>CV Task 1</h1>
       <Sidebar tasks={TASKS} activeId={taskId} onSelect={setTaskId} />
     </aside>

     <main className="app">

      <ImageInputs inputs={task.inputs} urls={urls} onSelect={setImage} />

      <nav className="tabs">
        <button className={activeTab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>Preview</button>
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