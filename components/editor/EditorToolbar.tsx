import { Bold, Italic, List, Heading2, Link, AlignLeft } from "lucide-react";

export function EditorToolbar({ exec }: { exec: (cmd: string, val?: string) => void }) {
  const tools = [
    { icon: <Bold size={14} />, cmd: "bold", title: "Gras" },
    { icon: <Italic size={14} />, cmd: "italic", title: "Italique" },
    { icon: <Heading2 size={14} />, cmd: "formatBlock", val: "h2", title: "Titre" },
    { icon: <List size={14} />, cmd: "insertUnorderedList", title: "Liste" },
    { icon: <Link size={14} />, cmd: "createLink", title: "Lien" },
    { icon: <AlignLeft size={14} />, cmd: "justifyLeft", title: "Aligner" },
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--s1))]">
      {tools.map((t, i) => (
        <button key={i} type="button" title={t.title}
          onClick={() => {
            if (t.cmd === "createLink") {
              const url = prompt("URL du lien :");
              if (url) exec(t.cmd, url);
            } else exec(t.cmd, t.val);
          }}
          className="p-1.5 rounded-lg text-[hsl(var(--dim))] hover:text-white hover:bg-[hsl(var(--s2))] transition-colors">
          {t.icon}
        </button>
      ))}
      <div className="w-px h-4 mx-1 bg-[hsl(var(--border))]" />
      {["#3b82f6", "#ef4444", "#f59e0b", "#10b981"].map(c => (
        <button key={c} type="button" title={c} onClick={() => exec("foreColor", c)}
          className="w-4 h-4 rounded-full border border-[hsl(var(--border))] transition-transform hover:scale-110"
          style={{ background: c }} />
      ))}
    </div>
  );
}
