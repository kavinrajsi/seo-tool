export const EXT_MAP = {
  // Documents
  ai: "document", pdf: "document", doc: "document", docx: "document",
  txt: "document", psd: "document", indd: "document", xls: "document",
  xlsx: "document", ppt: "document", pptx: "document", rtf: "document",
  pages: "document", numbers: "document", key: "document", csv: "document",
  // Images
  jpg: "image", jpeg: "image", png: "image", gif: "image",
  webp: "image", svg: "image", bmp: "image", tiff: "image",
  raw: "image", cr2: "image", nef: "image", ico: "image", heic: "image",
  // Video
  mp4: "video", mov: "video", avi: "video", mkv: "video",
  wmv: "video", flv: "video", m4v: "video", webm: "video",
  // Audio
  mp3: "audio", wav: "audio", aac: "audio", flac: "audio",
  ogg: "audio", m4a: "audio", wma: "audio",
  // Archive
  zip: "archive", rar: "archive", tar: "archive", gz: "archive",
  "7z": "archive", dmg: "archive", iso: "archive",
  // Font
  otf: "font", ttf: "font", woff: "font", woff2: "font", eot: "font",
};

export const TYPE_EXTS = {
  document: ["ai", "pdf", "doc", "docx", "txt", "psd", "indd", "xls", "xlsx", "ppt", "pptx", "rtf", "csv"],
  image:    ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "raw", "heic"],
  video:    ["mp4", "mov", "avi", "mkv", "wmv", "flv", "m4v"],
  audio:    ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"],
  archive:  ["zip", "rar", "tar", "gz", "7z", "dmg", "iso"],
  font:     ["otf", "ttf", "woff", "woff2", "eot"],
};

export const TYPE_CONFIG = {
  document: { label: "Documents", color: "bg-blue-500" },
  image:    { label: "Images",    color: "bg-purple-500" },
  video:    { label: "Video",     color: "bg-violet-400" },
  audio:    { label: "Audio",     color: "bg-amber-500" },
  archive:  { label: "Archive",   color: "bg-red-500" },
  font:     { label: "Fonts",     color: "bg-emerald-500" },
  folder:   { label: "Folders",   color: "bg-slate-500" },
  other:    { label: "Other",     color: "bg-zinc-600" },
};

export function getFileType(path) {
  const name = (path.split("/").pop() ?? "").trim();
  if (!name || name === "." || name === "..") return "folder";
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "folder";
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_MAP[ext] ?? "other";
}

export function getFileName(path) {
  return path.split("/").pop() || path;
}

export function getDirPath(path) {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
}
