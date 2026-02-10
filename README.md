🏛️ رُواق | Riwaq
The Sanctuary for Focused Scholars & Social Productivity

رُواق هو منصة إنتاجية اجتماعية متكاملة مبنية باستخدام Angular و Supabase، تهدف لخلق بيئة تركيز جماعية لحظية (Real-time). النظام يجمع بين تتبع الإنتاجية الشخصية والتفاعل الاجتماعي لضمان أقصى درجات الالتزام.

🚀 المميزات الأساسية (Core Features)
بناءً على بنية قاعدة البيانات المتطورة للمشروع:

⏱️ Independent Focus Sessions: نظام توقيت ذكي يسجل جلسات التركيز بدقة في جدول focus_sessions.

📡 Real-time Room Presence: رؤية الطلاب المتواجدين معك في الغرفة لحظياً عبر room_presence_tracking.

🏆 Social Leaderboard: نظام ترتيب تفاعلي يعرض المتصدرين بناءً على ساعات التركيز.

✅ Task Management: تتبع المهام اليومية وربطها بجلسات التركيز لزيادة الإنتاجية.

📊 Daily Summaries: ملخصات يومية ذكية تعرض مستوى الإنجاز والنشاط عبر جدول daily_focus_summary.

🛠️ البناء التقني (Tech Stack)
Frontend: Angular 17+ (Signals, Standalone Components, Deferrable Views).

Backend: Supabase (Auth, Real-time Presence, PostgreSQL).

State Management: Angular Signals لضمان استجابة فورية للواجهة (Fine-grained reactivity).

Security: حماية كاملة للجداول باستخدام RLS (Row Level Security).

⚙️ إعداد المشروع (Installation & Setup)
المشروع يستخدم نظام الـ Environment Templates لضمان أقصى درجات الأمان للمفاتيح الخاصة بك.

تحميل المشروع:

Bash
git clone https://github.com/riwaq/riwaq.git
cd riwaq
تثبيت المكتبات:

Bash
npm install
إعداد ملفات البيئة (Environments):

قم بإنشاء ملف src/environments/environment.ts بناءً على ملف الـ template.

أضف مفاتيح Supabase URL و Anon Key الخاصة بك.

تشغيل المشروع:

Bash
ng serve
📈 حالة الأداء (Performance Roadmap)
حالياً، يحقق المشروع سكور أداء 65 في Lighthouse. الخطوات القادمة في خريطة الطريق تشمل:

تحسين الـ LCP (Largest Contentful Paint) لتقليل وقت التحميل الأولي.

ضبط الـ FCP و الـ Speed Index للوصول لسكور +90.

استخدام @defer في Angular لتحميل المكونات الثقيلة عند الحاجة فقط.

🛡️ الأمان والخصوصية (Security)
[!IMPORTANT] تم استثناء ملفات الـ environment.ts و environment.development.ts من الرفع على المستودع العام لحماية مفاتيح API الخاصة بـ Supabase. يرجى استخدام القالب المرفق environment.template.ts لإعداد النسخة المحلية الخاصة بك.

🤝 المساهمة (Contributing)
نحن نرحب بكل المطورين المهتمين ببناء مستقبل الإنتاجية الاجتماعية. يمكنك فتح Issue أو إرسال Pull Request بتعديلاتك.
