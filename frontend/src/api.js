/*
 * The only place that talks to the backend.
 * Input : task (from tasks.js), option values, image files in the order of task.inputs.
 * Output: the endpoint's JSON (images are base64 PNG strings).
 */

export const toSrc = (base64Png) => `data:image/png;base64,${base64Png}`;

export function base64ToFile(base64Png, name = "result.png") {
  const bytes = Uint8Array.from(atob(base64Png), (char) => char.charCodeAt(0));
  return new File([bytes], name, { type: "image/png" });
}

function errorMessage(body, status) {
  const detail = body?.detail;
  if (typeof detail === "string") return detail; // 400 from a service ValueError
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join("; "); // 422 from FastAPI
  return `Request failed (HTTP ${status})`;
}

async function runTask(task, values, images) {
  const form = new FormData();
  task.inputs.forEach((name, i) => form.append(name, images[i]));
  for (const [name, value] of Object.entries(values)) {
    if (value !== "" && value !== null) form.append(name, value);
  }

  let response;
  try {
    response = await fetch(task.endpoint, { method: "POST", body: form });
  } catch {
    throw new Error("Cannot reach the backend. Is uvicorn running on port 8000?");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(body, response.status));
  return body;
}

/* Never throws: returns {response, error} so callers only set state. */
export async function runTaskSafe(task, values, images) {
  try {
    return { response: await runTask(task, values, images), error: "" };
  } catch (e) {
    return { response: null, error: e.message };
  }
}
