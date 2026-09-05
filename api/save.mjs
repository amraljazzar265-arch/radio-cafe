/* ============================================================
   Saves the menu.

   The panel sends the whole menu and this writes it to menu.js in the
   repository; Vercel sees the commit and republishes the site. That is the
   entire storage layer -- git is the database, which means every price
   change has an author, a time, and a way back.

   The GitHub token never reaches the browser. It lives here, in the
   environment, and the panel authenticates with a password instead. Three
   variables are required on Vercel:

     ADMIN_PASSWORD   the password the panel asks for
     GITHUB_TOKEN     fine-grained token, Contents: read and write, this repo
     GITHUB_REPO      owner/name, e.g. your-account/radio-cafe

   GITHUB_BRANCH is optional and defaults to main.
   ============================================================ */

const FILE = "menu.js";
const API = "https://api.github.com";

/* Fields the menu is allowed to carry. Anything else in the payload is
   dropped rather than trusted: this file is served to every visitor as
   JavaScript, so what goes into it has to be shaped here, not there. */
const STR = ["img", "cat", "ar", "en", "d", "price", "note", "boba", "deck"];
const NUM = [];
const BOOL = ["star", "soldout"];

function clean(list) {
  if (!Array.isArray(list) || !list.length) throw new Error("المنيو فارغ");
  if (list.length > 300) throw new Error("عدد الأصناف كبير بشكل غير متوقّع");
  return list.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new Error("صنف غير صالح رقم " + (i + 1));
    const out = {};
    for (const k of STR) if (typeof raw[k] === "string" && raw[k] !== "") out[k] = raw[k];
    for (const k of NUM) if (Number.isFinite(raw[k])) out[k] = raw[k];
    for (const k of BOOL) if (raw[k] === true) out[k] = true;
    if (!out.img || !out.ar) throw new Error("صنف بلا اسم أو صورة رقم " + (i + 1));
    if (Array.isArray(raw.opts)) {
      out.opts = raw.opts.map(o => ({ ar: String(o.ar || ""), p: price(o.p) }));
    }
    /* `extras` is a list of independent yes/no additions; `extra` is the older
       single-addition form and is still read so an old payload cannot silently
       drop the choice from a drink. */
    if (Array.isArray(raw.extras)) {
      out.extras = raw.extras.slice(0, 8).map(extra);
    } else if (raw.extra && typeof raw.extra === "object") {
      out.extra = extra(raw.extra);
    }
    return out;
  });
}
function extra(raw) {
  if (!raw || typeof raw !== "object") throw new Error("إضافة غير صالحة");
  const out = { ar: String(raw.ar || ""), p: price(raw.p) };
  if (raw.off) out.off = String(raw.off);
  if (raw.title) out.title = String(raw.title);
  return out;
}
function price(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > 1000000) throw new Error("سعر غير صالح: " + v);
  return n;
}

function render(list) {
  const rows = list.map(x => "  " + JSON.stringify(x)).join(",\n");
  return `/* ============================================================
   Radio Cafe — بيانات المنيو
   هذا الملف تكتبه لوحة التحكم. عدّل الأسعار والتوفّر من /admin
   وليس من هنا، حتى لا يضيع التعديل مع أول حفظ من اللوحة.

   soldout: true  =  الصنف غير متوفّر اليوم (يظهر بالمنيو ولا يُطلب)
   ============================================================ */
const MENU_VERSION = ${Date.now()};
const P = [
${rows}
];
`;
}

async function gh(path, token, init = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: "Bearer " + token,
      "user-agent": "radio-cafe-admin",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("GitHub " + r.status + ": " + (body.message || "خطأ غير معروف"));
  return body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST فقط" });

  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO)
    return res.status(500).json({ error: "الإعدادات ناقصة على الخادم (ADMIN_PASSWORD / GITHUB_TOKEN / GITHUB_REPO)" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  /* Constant-time-ish compare. The password is short and the endpoint is not
     a login form, but a length check first costs nothing. */
  const given = String(body.password || "");
  let ok = given.length === ADMIN_PASSWORD.length;
  for (let i = 0; i < ADMIN_PASSWORD.length; i++)
    if (given[i] !== ADMIN_PASSWORD[i]) ok = false;
  if (!ok) return res.status(401).json({ error: "كلمة السر غير صحيحة" });

  if (body.check) return res.status(200).json({ ok: true });   // the panel's door test

  let file;
  try {
    file = render(clean(body.menu));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const branch = GITHUB_BRANCH || "main";
  const base = "/repos/" + GITHUB_REPO + "/contents/" + FILE;
  try {
    // the sha of what is there now: without it GitHub refuses to overwrite,
    // which is exactly the protection wanted if two people save at once
    const current = await gh(base + "?ref=" + branch, GITHUB_TOKEN);
    const put = await gh(base, GITHUB_TOKEN, {
      method: "PUT",
      body: JSON.stringify({
        message: "Update menu prices and availability from the panel",
        content: Buffer.from(file, "utf8").toString("base64"),
        sha: current.sha,
        branch,
      }),
    });
    return res.status(200).json({ ok: true, commit: put.commit?.sha?.slice(0, 7) || null });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
