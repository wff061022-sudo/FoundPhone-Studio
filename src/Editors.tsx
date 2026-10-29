import { getFields } from "./fields";
import { useState, lazy, Suspense } from "react";
import { X, Trash2, ImagePlus, Check } from "lucide-react";
import { type Item, type Work, itemSchema, safeMedia } from "./schema";
import { mediaData } from "./io";
import { parseChat, parseCsv } from "./chat";
import { getApp } from "./registry";
const RichEditor = lazy(() => import("./RichEditor"));
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header>
          <div>
            <span className="eyebrow">FOUNDPHONE STUDIO</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function ItemEditor({
  item,
  app,
  onSave,
  onDelete,
  onClose,
}: {
  item: Item;
  app: string;
  onSave: (i: Item) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, set] = useState(item);
  const [error, setError] = useState("");
  const setField = <K extends keyof Item>(key: K, value: Item[K]) =>
    set((s) => ({ ...s, [key]: value }));
  const plugin = getApp(app);
  return (
    <Modal
      title={`编辑${plugin.engine === "messaging" ? "消息" : "内容"} · ${plugin.name}`}
      onClose={onClose}
    >
      <div className="editor-fields">
        <label>
          内容 ID
          <input
            aria-label="内容 ID"
            readOnly
            value={draft.id}
            onFocus={(e) => e.target.select()}
          />
        </label>
        <div className="two-cols">
          <label>
            {plugin.engine === "messaging" ? "会话名称" : "标题"}
            <input
              value={draft.title}
              onChange={(e) => setField("title", e.target.value)}
            />
          </label>
          <label>
            发送者 / 作者
            <input
              value={draft.sender}
              onChange={(e) => setField("sender", e.target.value)}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            时间
            <input
              value={draft.time}
              onChange={(e) => setField("time", e.target.value)}
            />
          </label>
          <label>
            内容类型
            <select
              value={draft.kind}
              onChange={(e) => setField("kind", e.target.value as Item["kind"])}
            >
              {[
                "text",
                "image",
                "audio",
                "video",
                "file",
                "transfer",
                "call",
                "order",
                "note",
                "post",
                "event",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
        </div>
        {["messaging", "social"].includes(plugin.engine) && (
          <label className="upload-zone">
            <ImagePlus size={20} />
            <span>发送者头像</span>
            <input
              type="file"
              aria-label="上传发送者头像"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setField("avatar", await mediaData(f));
                  setError("");
                } catch (err) {
                  setError(String(err));
                }
              }}
            />
            {draft.avatar && (
              <>
                <img
                  className="avatar-preview"
                  src={safeMedia(draft.avatar)}
                  alt="头像预览"
                />
                <button type="button" onClick={() => setField("avatar", "")}>
                  移除头像
                </button>
              </>
            )}
          </label>
        )}
        {app === "instagram" && (
          <div className="check-row">
            <label>
              <input
                type="checkbox"
                aria-label="作为Instagram快拍展示"
                checked={draft.meta?.story === "true"}
                onChange={(e) =>
                  setField("meta", {
                    ...draft.meta,
                    story: e.target.checked ? "true" : "false",
                  })
                }
              />
              作为 Instagram 快拍展示
            </label>
          </div>
        )}
        {getFields(app).length > 0 && (
          <div className="two-cols">
            {getFields(app).map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  type={field.type ?? "text"}
                  value={draft.meta?.[field.key] ?? ""}
                  onChange={(e) =>
                    setField("meta", {
                      ...draft.meta,
                      [field.key]: e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
        )}
        <label>
          故事内容
          {plugin.engine === "document" ? (
            <>
              <Suspense fallback={<p>正在打开编辑器…</p>}>
                <RichEditor
                  item={item}
                  onChange={(patch) => set((s) => ({ ...s, ...patch }))}
                />
              </Suspense>
            </>
          ) : (
            <textarea
              rows={5}
              value={draft.body}
              onChange={(e) => setField("body", e.target.value)}
            />
          )}
        </label>
        <div className="two-cols">
          <label>
            文件夹 / App 分栏
            <input
              list="item-folders"
              value={draft.folder}
              onChange={(e) => setField("folder", e.target.value)}
              placeholder="可输入新的分组或频道名称"
            />
            <datalist id="item-folders">
              {[...new Set([...plugin.tabs, draft.folder])]
                .filter(Boolean)
                .map((t) => (
                  <option key={t} value={t} />
                ))}
            </datalist>
          </label>
          <label>
            内容密码
            <input
              value={draft.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="可留空"
            />
          </label>
        </div>
        <label className="upload-zone">
          <ImagePlus size={20} />
          <span>
            {draft.media ? "替换已上传素材" : "添加图片、音频或视频"}
            <small>仅本地保存 · 图片自动压缩 · 单文件 20 MB</small>
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,audio/*,video/mp4,video/webm"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const data = await mediaData(f);
                set((s) => ({
                  ...s,
                  media: data,
                  kind: f.type.startsWith("image")
                    ? "image"
                    : f.type.startsWith("audio")
                      ? "audio"
                      : "video",
                }));
                setError("");
              } catch (err) {
                setError(String(err));
              }
            }}
          />
        </label>
        {draft.media && (
          <button className="text-button" onClick={() => setField("media", "")}>
            移除素材
          </button>
        )}
        <div className="check-row">
          <label>
            <input
              type="checkbox"
              checked={draft.outgoing}
              onChange={(e) => setField("outgoing", e.target.checked)}
            />
            本人发送
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.hidden}
              onChange={(e) => setField("hidden", e.target.checked)}
            />
            初始隐藏
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.favorite}
              onChange={(e) => setField("favorite", e.target.checked)}
            />
            收藏
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.read}
              onChange={(e) => setField("read", e.target.checked)}
            />
            已读
          </label>
        </div>
        <label>
          解锁变量
          <input
            placeholder="例如 found（变量为 true 时显示）"
            value={draft.unlock}
            onChange={(e) => setField("unlock", e.target.value)}
          />
        </label>
        {plugin.engine === "social" && (
          <>
            <label>
              虚构点赞数
              <input
                type="number"
                min="0"
                value={draft.likes}
                onChange={(e) => setField("likes", Number(e.target.value))}
              />
            </label>
            <label>
              评论（每行一条）
              <textarea
                value={draft.comments.join("\n")}
                onChange={(e) =>
                  setField(
                    "comments",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
              />
            </label>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
      <footer>
        <button className="danger ghost" onClick={onDelete}>
          <Trash2 size={15} />
          删除
        </button>
        <button
          className="primary"
          onClick={() => {
            const parsed = itemSchema.safeParse(draft);
            if (parsed.success) onSave(parsed.data);
            else setError(parsed.error.message);
          }}
        >
          <Check size={16} />
          保存内容
        </button>
      </footer>
    </Modal>
  );
}
export function PhoneSettings({
  work,
  onChange,
  onClose,
}: {
  work: Work;
  onChange: (fn: (w: Work) => void) => void;
  onClose: () => void;
}) {
  const [draft, set] = useState(work.phone);
  return (
    <Modal title="手机设置" onClose={onClose}>
      <div className="editor-fields">
        <div className="two-cols">
          <label>
            机主名称
            <input
              value={draft.owner}
              onChange={(e) => set({ ...draft, owner: e.target.value })}
            />
          </label>
          <label>
            锁屏密码
            <input
              maxLength={12}
              value={draft.passcode}
              onChange={(e) => set({ ...draft, passcode: e.target.value })}
            />
          </label>
        </div>
        <label>
          壁纸
          <div className="wallpaper-options">
            {["sage", "sand", "night", "rose"].map((w) => (
              <button
                key={w}
                aria-label={`选择${w}壁纸`}
                className={`wallpaper-${w} ${draft.wallpaper === w ? "chosen" : ""}`}
                onClick={() => set({ ...draft, wallpaper: w })}
              >
                {draft.wallpaper === w && <Check size={16} />}
              </button>
            ))}
          </div>
        </label>
        <div className="two-cols">
          <label>
            主题
            <select
              value={draft.theme}
              onChange={(e) =>
                set({ ...draft, theme: e.target.value as "light" | "dark" })
              }
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </label>
          <label>
            虚拟时间
            <input
              type="time"
              value={draft.time}
              onChange={(e) => set({ ...draft, time: e.target.value })}
            />
          </label>
          <label>
            电量
            <input
              type="number"
              min={0}
              max={100}
              value={draft.battery}
              onChange={(e) =>
                set({
                  ...draft,
                  battery: Math.max(0, Math.min(100, Number(e.target.value))),
                })
              }
            />
          </label>
          <label>
            网络
            <input
              value={draft.network}
              onChange={(e) => set({ ...draft, network: e.target.value })}
            />
          </label>
        </div>
        <label>
          <input
            type="checkbox"
            checked={draft.notifications}
            onChange={(e) => set({ ...draft, notifications: e.target.checked })}
          />
          显示剧情通知
        </label>
      </div>
      <footer>
        <span>设置会用于创作器和独立玩家。</span>
        <button
          className="primary"
          onClick={() => {
            onChange((w) => {
              w.phone = draft;
            });
            onClose();
          }}
        >
          保存设置
        </button>
      </footer>
    </Modal>
  );
}
export function BatchImport({
  onImport,
  onClose,
}: {
  onImport: (items: Item[]) => void;
  onClose: () => void;
}) {
  const [text, set] = useState(
    "[2026-09-01 08:30] 小林：你到学校了吗？\n[2026-09-01 08:31] 我：还没，快到了。",
  );
  const [format, setFormat] = useState("script");
  const [me, setMe] = useState("我");
  const [conversation, setConversation] = useState("小林");
  let parsed: { items: Item[]; errors: string[] };
  try {
    parsed =
      format === "csv"
        ? parseCsv(text)
        : format === "json"
          ? { items: itemSchema.array().parse(JSON.parse(text)), errors: [] }
          : parseChat(text);
  } catch (e) {
    parsed = { items: [], errors: [String(e)] };
  }
  return (
    <Modal title="批量导入聊天" onClose={onClose}>
      <div className="editor-fields">
        <div className="two-cols">
          <label>
            格式
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="script">聊天脚本</option>
              <option value="csv">CSV · time,sender,body</option>
              <option value="json">JSON · Item[]</option>
            </select>
          </label>
          <label>
            会话名称
            <input
              value={conversation}
              onChange={(e) => setConversation(e.target.value)}
            />
          </label>
        </div>
        <label>
          代表机主的发送者
          <input value={me} onChange={(e) => setMe(e.target.value)} />
        </label>
        <textarea rows={8} value={text} onChange={(e) => set(e.target.value)} />
        <div className="import-preview">
          <strong>解析预览 · {parsed.items.length} 条</strong>
          {parsed.items.slice(0, 20).map((i) => (
            <p key={i.id}>
              <small>{i.time}</small> <b>{i.sender}</b>：{i.body}
            </p>
          ))}
        </div>
        {parsed.errors.map((e, i) => (
          <p key={i} className="error">
            {e}
          </p>
        ))}
      </div>
      <footer>
        <span>确认后写入当前 App，可撤销。</span>
        <button
          className="primary"
          disabled={!!parsed.errors.length || !parsed.items.length}
          onClick={() =>
            onImport(
              parsed.items.map((i) => ({
                ...i,
                title: conversation,
                outgoing: i.sender === me,
              })),
            )
          }
        >
          确认导入
        </button>
      </footer>
    </Modal>
  );
}
