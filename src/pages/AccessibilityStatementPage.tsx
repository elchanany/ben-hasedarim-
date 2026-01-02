import React from 'react';
import { PageProps } from '../App';

export const AccessibilityStatementPage: React.FC<PageProps> = () => {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl text-right dir-rtl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-royal-blue">הצהרת נגישות</h1>
            <p className="mb-4 text-gray-600">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>

            <div className="space-y-6 text-dark-text">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. מבוא</h2>
                    <p>
                        אנו ב"בין הסדורים" רואים חשיבות עליונה בהנגשת האתר לאנשים עם מוגבלויות, מתוך אמונה כי לכל אדם מגיעה הזכות לחיות בכבוד, שוויון, נוחות ועצמאות.
                        השקענו משאבים רבים כדי להפוך את האתר לנגיש וידידותי לשימוש לכלל האוכלוסייה.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. רמת הנגישות ובדיקות</h2>
                    <p>
                        אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013.
                        ההתאמות בוצעו עפ"י המלצות התקן הישראלי (ת"י 5568) לנגישות תכנים באינטרנט ברמת AA, ומסמך WCAG 2.1 הבינלאומי.
                    </p>
                    <p className="mt-2">
                        בדיקות הנגישות בוצעו באמצעות שילוב של סריקות אוטומטיות (לזיהוי בעיות טכניות בקוד) ובדיקות ידניות הכוללות ניווט מקלדת ושימוש בתוכנות קורא מסך (כגון NVDA) בדפדפנים נפוצים.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. התאמות שבוצעו באתר</h2>
                    <ul className="list-disc list-inside mr-4 mt-2">
                        <li><strong>מבנה וכותרות:</strong> האתר בנוי בצורה סמנטית עם תגיות ARIA והיררכיית כותרות ברורה לניווט קל.</li>
                        <li><strong>ניווט מקלדת:</strong> תמיכה מלאה בניווט ללא עכבר (Tab, Enter, Arrows).</li>
                        <li><strong>טפסים:</strong> לכל השדות יש תוויות (Labels) ברורות והודעות שגיאה מוקראות.</li>
                        <li><strong>עיצוב:</strong> צבעי האתר נבחרו לעמוד ביחס ניגודיות תקין.</li>
                        <li><strong>רכיב נגישות:</strong> קיים סרגל צד המאפשר שינוי גודל פונט, ניגודיות גבוהה, והדגשת רכיבים.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. סייגים ומגבלות</h2>
                    <p>
                        למרות מאמצנו להנגיש את כלל דפי האתר, ייתכן ויתגלו חלקים שטרם הונגשו במלואם, בפרט:
                    </p>
                    <ul className="list-disc list-inside mr-4 mt-2">
                        <li>ייתכנו הודעות צ'אט דינמיות שלא תמיד יוקראו מיידית על ידי כל קוראי המסך.</li>
                        <li>מסמכים חיצוניים ישנים (כגון קובצי PDF מצורפים) עשויים שלא להיות נגישים במלואם.</li>
                    </ul>
                    <p className="mt-2">
                        אנו פועלים באופן שוטף לשיפור הנגישות ונשמח לקבל משוב על כל תקלה.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. פרטי רכז נגישות</h2>
                    <p>
                        לפניות בנושא נגישות, דיווח על תקלות, או בקשת עזרה, ניתן לפנות לרכז הנגישות של הארגון:
                    </p>
                    <ul className="list-none mr-4 mt-2 space-y-1">
                        <li><strong>שם:</strong> אלחנן יהודה</li>
                        <li><strong>אימייל:</strong> elch752@gmail.com</li>
                        <li><strong>טלפון:</strong> 054-849-7407 (ניתן לשלוח הודעת וואטסאפ/SMS)</li>
                        <li><strong>מענה זמין:</strong> ימים א'-ה' בין השעות 09:00 - 18:00</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};
