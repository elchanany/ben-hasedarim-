import React from 'react';
import { PageProps } from '../App';

export const PrivacyPolicyPage: React.FC<PageProps> = () => {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl text-right dir-rtl">
            <h1 className="text-3xl font-bold mb-6 text-royal-blue">מדיניות פרטיות</h1>
            <p className="mb-4 text-gray-600">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>

            <div className="space-y-6 text-dark-text">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. כללי</h2>
                    <p>
                        אנו ב"בין הסדורים" (להלן: "האתר" או "המפעיל") מכבדים את פרטיותך ומחויבים להגן על המידע האישי שלך.
                        מדיניות זו מתארת את אופן איסוף, שימוש ושיתוף המידע בעת השימוש באתר.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. איסוף מידע</h2>
                    <p>אנו אוספים את סוגי המידע הבאים:</p>
                    <ul className="list-disc list-inside mr-4 mt-2">
                        <li><strong>מידע אישי:</strong> שם, מספר טלפון, כתובת אימייל, וכדומה, הנמסרים על ידך בעת הרישום או יצירת קשר.</li>
                        <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, ונתוני שימוש באתר הנאספים אוטומטית.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. שימוש במידע</h2>
                    <p>המידע שנאסף משמש למטרות הבאות:</p>
                    <ul className="list-disc list-inside mr-4 mt-2">
                        <li>אספקת שירותי האתר ותפעולו השוטף.</li>
                        <li>יצירת קשר ומשלוח עדכונים רלוונטיים (בכפוף להסכמתך).</li>
                        <li>שיפור חווית המשתמש וניתוח סטטיסטי.</li>
                        <li>אבטחת האתר ומניעת הונאות.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. עוגיות (Cookies) וטכנולוגיות מעקב</h2>
                    <p>
                        האתר משתמש בקובצי "עוגיות" (Cookies) ובטכנולוגיות דומות (כגון Local Storage) לצורך תפעולו השוטף, שיפור חווית המשתמש, ואבטחת מידע.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">
                        אנו משתמשים בעוגיות מהסוגים הבאים:
                        <br />1. <strong>עוגיות חיוניות:</strong> נדרשות לצורך התחברות למערכת, שמירת סשן פעיל (באמצעות Firebase Auth), ואבטחת הפרופיל שלך.
                        <br />2. <strong>עוגיות העדפה:</strong> שומרות את בחירותיך (כגון הסכמה למדיניות זו, או הגדרות נגישות).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. גילוי נאות: שימוש בבינה מלאכותית (AI)</h2>
                    <p>
                        שים לב: חלק משירותי האתר מבוססים על טכנולוגיות בינה מלאכותית (Artificial Intelligence).
                    </p>
                    <ul className="list-disc list-inside mr-4 mt-2 text-sm">
                        <li><strong>שימושים:</strong> המערכת משתמשת ב-AI לצורך התאמת משרות ("Match"), סינון תוכן פוגעני, ושיפור הניסוח במודעות במידת הצורך.</li>
                        <li><strong>אחריות:</strong> המלצות המערכת הינן המלצות בלבד ואין להסתמך עליהן כייעוץ מקצועי מחייב. למרות מאמצינו לדיוק, ייתכנו טעויות ("הזיות") כתוצאה מאופי טכנולוגיית ה-LLM.</li>
                        <li><strong>פרטיות ב-AI:</strong> איננו משתמשים במידע האישי המזהה שלך (שם, טלפון) לצורך אימון מודלים ציבוריים.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. מסירת מידע ואבטחה (תיקון 13 לחוק)</h2>
                    <p>
                        אנו פועלים בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 (כולל תיקון 13 משנת 2024/5), ומיישמים עקרונות של "צמצום מידע" (Data Minimization). אנו אוספים רק את המידע ההכרחי למתן השירות.
                    </p>
                    <p className="mt-2">
                        המידע נשמר על גבי שרתים מאובטחים (Google Cloud/Firebase). איננו סוחרים במידע שלך. העברה לצד ג' תעשה רק במקרים של התחייבות חוזית לאספקת שירות (כגון שירותי סליקה או אחסון) או מכוח צו שיפוטי.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">7. זכויותיך</h2>
                    <p>
                        בהתאם לחוק הגנת הפרטיות, עומדת לך הזכות לעיין במידע המוחזק עליך ולבקש לתקנו או למחוק אותו במידה ואינו נכון.
                        לפניות בנושא זה ניתן ליצור קשר דרך עמוד יצירת הקשר באתר.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">8. שינויים במדיניות</h2>
                    <p>
                        אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. השינויים יכנסו לתוקף מיד עם פרסומם באתר.
                    </p>
                </section>
            </div>
        </div>
    );
};
