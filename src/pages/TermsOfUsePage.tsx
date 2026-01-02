import React from 'react';
import { PageProps } from '../App';

export const TermsOfUsePage: React.FC<PageProps> = () => {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl text-right dir-rtl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-royal-blue">תנאי שימוש</h1>
            <p className="mb-4 text-gray-600">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>

            <div className="space-y-6 text-dark-text">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. הסכמה לתנאים</h2>
                    <p>
                        השימוש באתר "בין הסדורים" (להלן: "האתר") ובשירותיו מעיד על הסכמתך המלאה לתנאי שימוש אלה.
                        אם אינך מסכים לתנאים אלו, עליך להימנע משימוש באתר.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. השירות</h2>
                    <p>
                        האתר משמש כפלטפורמה לחיבור בין מחפשי עבודה למציעי עבודה במגזר החרדי.
                        המפעיל אינו מעסיק ואינו צד להתקשרות בין המשתמשים. השירות ניתן כמות שהוא ("As Is").
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. אחריות המשתמש</h2>
                    <ul className="list-disc list-inside mr-4 mt-2">
                        <li>המשתמש מצהיר כי המידע שהוא מוסר הינו אמין ומדויק.</li>
                        <li>חל איסור להשתמש באתר למטרות בלתי חוקיות או פוגעניות.</li>
                        <li>המשתמש אחראי בלעדית לכל אינטראקציה או עסקה שתתבצע מול משתמשים אחרים.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. הגבלת אחריות</h2>
                    <p>
                        מפעלי האתר לא ישאו באחריות לכל נזק, ישיר או עקיף, שיגרם כתוצאה משימוש באתר,
                        לרבות נזקים הנובעים מהסתמכות על מידע המפורסם באתר או מהתקשרות עם צדדים שלישיים.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. קניין רוחני</h2>
                    <p>
                        כל זכויות הקניין הרוחני באתר, לרבות עיצוב, קוד, ותוכן (למעט תוכן משתמשים), שייכות למפעיל האתר בלבד.
                        אין להעתיק, להפיץ או להשתמש בחומרים אלו ללא אישור בכתב.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. שינוי תנאים</h2>
                    <p>
                        הנהלת האתר רשאית לשנות את תנאי השימוש בכל עת. המשך השימוש באתר לאחר השינוי מהווה הסכמה לתנאים החדשים.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">7. סמכות שיפוט</h2>
                    <p>
                        על תנאי שימוש אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז ירושלים.
                    </p>
                </section>
            </div>
        </div>
    );
};
