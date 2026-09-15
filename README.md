# Radio Cafe — منيو

منيو رقمي تفاعلي لمقهى **Radio Cafe** — صفحة واحدة، عربي (RTL)، بتأثيرات ثلاثية الأبعاد
وتوهّج، مُحسَّن للجوال، مع نظام طلب عبر واتساب بلا خادم.

## المحتوى

- `index.html` — الصفحة الكاملة (HTML + CSS + JS في ملف واحد)
- `admin.html` — لوحة التحكم بالأسعار والتوفّر (`/admin`)
- `menu.js` — بيانات المنيو (٧٢ صنفاً بأسعارها) — تكتبها اللوحة، لا تُعدَّل يدوياً
- `netlify/functions/save.mjs` — حفظ المنيو عبر GitHub API (يستجيب على `/api/save`)
- `assets/menu/*.webp` — صور المنتجات (WebP مضغوط)
- `logo.webp` · `hero-card.webp` — الشعار وصورة الهيرو
- `The-originals.woff2` — خط شريط الفئات
- `netlify.toml` — إعدادات النشر وترويسات الكاش

## الأقسام

موهيتو · ميلك شيك · حلويات · مشروبات ساخنة · قهوة باردة · عصائر فريش · PanPop

## التشغيل محلياً

افتح `index.html` في المتصفح مباشرة، أو شغّل خادماً ساكناً:

```bash
python -m http.server 4177
```

ثم افتح `http://localhost:4177`.

لوحة التحكم تحتاج الدالة، فلا تعمل مع الخادم الساكن. لتجربتها محلياً:

```bash
npx netlify-cli dev
```

## النشر — Netlify

الموقع ثابت بلا خطوة بناء: Netlify ينشر جذر المستودع كما هو، ومعه دالة واحدة
تخدم `/api/save`.

1. على [netlify.com](https://netlify.com) → **Add new site → Import from GitHub** → اختر
   مستودع `radio-cafe`. لا تغيّر إعدادات البناء؛ `netlify.toml` يتكفّل بها.
2. **Site configuration → Environment variables** — أضف الثلاثة:

   | المتغيّر | القيمة |
   |---|---|
   | `ADMIN_PASSWORD` | كلمة سر اللوحة |
   | `GITHUB_TOKEN` | توكن GitHub دقيق الصلاحيات — **Contents: read and write** على هذا المستودع وحده |
   | `GITHUB_REPO` | `amraljazzar265-arch/radio-cafe` |

   `GITHUB_BRANCH` اختياري وقيمته الافتراضية `main`.

3. أعد النشر بعد إضافة المتغيّرات (**Deploys → Trigger deploy**) — الدالة تقرأها
   عند التشغيل لا عند البناء، لكن إعادة النشر تضمن التقاطها.

### كيف يعمل الحفظ

git هو قاعدة البيانات. اللوحة ترسل المنيو كاملاً إلى `/api/save`، والدالة تكتبه
في `menu.js` عبر GitHub API، فيرى Netlify الـ commit ويعيد النشر. يعني كل تغيير
سعر له مؤلّف ووقت وطريق للرجوع — وتوكن GitHub لا يصل المتصفّح إطلاقاً.

التعديل يظهر للزبائن خلال نصف دقيقة تقريباً.
