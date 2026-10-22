import { ArrowRight, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    icon: UserRoundCheck,
    title: 'البيانات التي نستخدمها',
    body: 'قد تشمل بيانات الحساب ووسائل التواصل وبيانات الملف الشخصي وسجلات الحضور والمهام ومواعيد الاعتراف التي تُدخلها في الخدمة.',
  },
  {
    icon: ShieldCheck,
    title: 'الغرض والصلاحيات',
    body: 'تُستخدم البيانات لتشغيل خدمات الكنيسة ومتابعة الأنشطة. يستطيع الخادم المخوّل رؤية بيانات الطلاب التابعين لمجموعته، ويرى الطالب سجلاته، ويرى ولي الأمر بيانات الأبناء المرتبطة بحسابه.',
  },
  {
    icon: LockKeyhole,
    title: 'الحماية والاختيارات',
    body: 'تُخزّن كلمات المرور بصيغة تجزئة آمنة ويُشترط تسجيل الدخول للوصول إلى الحسابات. يمكنك التواصل مع إدارة الكنيسة لتصحيح بيانات حسابك أو طلب حذفها. لا تضع معلومات طارئة أو شديدة الحساسية في الملاحظات الاختيارية.',
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-dvh px-3 py-8 sm:px-5 sm:py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <Link to="/register" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-amber-200 transition hover:bg-white/5 hover:text-white">
          <ArrowRight aria-hidden="true" className="h-4 w-4" /> العودة إلى إنشاء الحساب
        </Link>
        <article className="mt-4 rounded-3xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl shadow-black/25 sm:p-8 md:p-10">
          <p className="text-xs font-extrabold tracking-[0.16em] text-amber-300">كنيسة موسي النبي ومارمرقس الرسول</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">سياسة الخصوصية واستخدام البيانات</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">نستخدم المعلومات التي تقدمها لتشغيل خدمات البوابة وتنظيم التواصل والمتابعة الكنسية. نوضح هنا ما يحتاجه المستخدم قبل إنشاء حساب.</p>
          <div className="mt-7 space-y-3">
            {sections.map(({ icon: Icon, title, body }) => (
              <section key={title} className="rounded-2xl border border-white/[0.07] bg-slate-950/55 p-4 sm:p-5">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Icon aria-hidden="true" className="h-5 w-5" /></span><h2 className="font-bold text-white">{title}</h2></div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
              </section>
            ))}
          </div>
          <p className="mt-6 border-t border-white/[0.08] pt-5 text-xs leading-6 text-slate-500">باستخدام البوابة، يرجى إدخال المعلومات اللازمة للخدمة فقط. للاستفسارات حول بيانات حسابك، تواصل مع إدارة الكنيسة.</p>
        </article>
      </div>
    </main>
  );
}
