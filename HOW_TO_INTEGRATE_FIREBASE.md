
# מדריך אינטגרציה עם Firebase לפרויקט "בין הסדורים"

מדריך זה מסביר כיצד לחבר את אפליקציית ה-React הקיימת "בין הסדורים" לשירותי Firebase השונים, כולל Authentication, Firestore, Hosting, וכן מכין את התשתית לשימוש ב-Firebase Functions ואינטגרציות צד שלישי.

## תוכן עניינים

1.  [דרישות קדם](#1-דרישות-קדם)
2.  [הקמת פרויקט Firebase](#2-הקמת-פרויקט-firebase)
    *   [יצירת פרויקט חדש](#21-יצירת-פרויקט-חדש)
    *   [הפעלת שירותים](#22-הפעלת-שירותים)
    *   [קבלת פרטי תצורה (Firebase Config)](#23-קבלת-פרטי-תצורה-firebase-config)
3.  [אינטגרציה של הקוד בצד הלקוח (Frontend)](#3-אינטגרציה-של-הקוד-בצד-הלקוח-frontend)
    *   [התקנת Firebase SDK](#31-התקנת-firebase-sdk)
    *   [עדכון קובץ התצורה `src/firebaseConfig.ts`](#32-עדכון-קובץ-התצורה-srcfirebaseconfigts)
    *   [מיקום קבצים חדשים ומעודכנים](#33-מיקום-קבצים-חדשים-ומעודכנים)
4.  [הגדרת Firestore Database](#4-הגדרת-firestore-database)
    *   [יצירת מסד נתונים](#41-יצירת-מסד-נתונים)
    *   [מבנה נתונים (Collections)](#42-מבנה-נתונים-collections)
    *   [חוקי אבטחה (Firestore Security Rules) - קריטי!](#43-חוקי-אבטחה-firestore-security-rules---קריטי)
    *   [חוקי אבטחה מבוססי תפקידים (Role-Based Security Rules)](#431-חוקי-אבטחה-מבוססי-תפקידים-role-based-security-rules)
5.  [הגדרת Firebase Hosting](#5-הגדרת-firebase-hosting)
    *   [התקנת Firebase CLI והתחברות](#51-התקנת-firebase-cli-והתחברות)
    *   [אתחול Firebase בפרויקט המקומי](#52-אתחול-firebase-בפרויקט-המקומי)
    *   [בניית האפליקציה לפריסה](#53-בניית-האפליקציה-לפריסה)
    *   [פריסה (Deploy)](#54-פריסה-deploy)
6.  [Firebase Functions (לוגיקת צד-שרת - המשך פיתוח)](#6-firebase-functions-לוגיקת-צד-שרת---המשך-פיתוח)
7.  [אינטגרציות צד שלישי (Twilio, SendGrid וכו' - המשך פיתוח)](#7-אינטגרציות-צד-שלישי-twilio-sendgrid-וכו---המשך-פיתוח)
8.  [בדיקות וצעדים הבאים](#8-בדיקות-וצעדים-הבאים)

---

## 1. דרישות קדם

*   **Node.js ו-npm/Yarn:** ודא שהם מותקנים במערכת שלך.
*   **חשבון Google:** נדרש ליצירת פרויקט Firebase.
*   **Firebase CLI:** כלי שורת הפקודה של Firebase. יותקן בהמשך אם אינו מותקן.

## 2. הקמת פרויקט Firebase

### 2.1. יצירת פרויקט חדש

1.  עבור אל [קונסולת Firebase](https://console.firebase.google.com/).
2.  לחץ על "Add project" (הוסף פרויקט).
3.  תן שם לפרויקט (לדוגמה, `bein-hasedarim-app`).
4.  (אופציונלי אך מומלץ) הפעל את Google Analytics עבור הפרויקט.
5.  המתן לסיום יצירת הפרויקט.

### 2.2. הפעלת שירותים

בתוך הפרויקט שיצרת בקונסולה:

1.  **Authentication (אימות):**
    *   בתפריט הצד, עבור אל `Build > Authentication`.
    *   לחץ על "Get started".
    *   תחת "Sign-in method", הפעל את הספקים הבאים:
        *   **Email/Password** (אימייל/סיסמה)
        *   **Google**
    *   עבור Google, ייתכן שתצטרך לספק כתובת אימייל לתמיכה בפרויקט.

2.  **Firestore Database (מסד נתונים):**
    *   בתפריט הצד, עבור אל `Build > Firestore Database`.
    *   לחץ על "Create database" (צור מסד נתונים).
    *   בחר להתחיל ב-**Production mode** (מצב ייצור). *אנו נגדיר חוקי אבטחה בהמשך.*
    *   בחר מיקום עבור השרתים שלך (לדוגמה, `eur3 (europe-west)` או המיקום הקרוב ביותר למשתמשים שלך).
    *   לחץ על "Enable" (הפעל).

3.  **Hosting (אירוח):**
    *   בתפריט הצד, עבור אל `Build > Hosting`.
    *   לחץ על "Get started".
    *   עקוב אחר ההוראות הראשוניות (נתקין את ה-CLI וניצור קשר בהמשך).

4.  **Functions (פונקציות ענן - אופציונלי בשלב זה, אך מומלץ להמשך):**
    *   בתפריט הצד, עבור אל `Build > Functions`.
    *   אם זו הפעם הראשונה, ייתכן שתצטרך לשדרג את תוכנית התשלום שלך ל-"Blaze (pay as you go)" כדי להשתמש בפונקציות שמתקשרות עם APIs חיצוניים (כמו שליחת מיילים/SMS). *Firebase מציע שכבה חינמית נדיבה גם בתוכנית Blaze.*
    *   אין צורך ליצור פונקציה כרגע דרך הקונסולה.

5.  **Analytics (אופציונלי, אם לא הופעל ביצירת הפרויקט):**
    *   ודא ש-Google Analytics מקושר לפרויקט (בדרך כלל מוגדר אוטומטית אם בחרת זאת ביצירת הפרויקט).

### 2.3. קבלת פרטי תצורה (Firebase Config)

אלו הפרטים שיקשרו את אפליקציית ה-React שלך לפרויקט ה-Firebase שיצרת.

1.  בקונסולת Firebase, עבור אל הגדרות הפרויקט (לחץ על סמל גלגל השיניים ליד "Project Overview").
2.  גלול מטה לסקציית "Your apps" (האפליקציות שלך).
3.  לחץ על סמל האינטרנט `</>` כדי לרשום אפליקציית ווב חדשה (אם לא עשית זאת עדיין).
    *   תן כינוי לאפליקציה (למשל, `bein-hasedarim-web`).
    *   (אופציונלי אך מומלץ) סמן את התיבה "Also set up Firebase Hosting for this app".
    *   לחץ על "Register app".
4.  בשלב "Add Firebase SDK", יוצגו לך פרטי התצורה תחת `firebaseConfig`. **העתק את האובייקט `firebaseConfig` במלואו.** הוא ייראה כך:

    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSyXXXX...",
      authDomain: "your-project-id.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project-id.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:XXXXXX",
      measurementId: "G-XXXXXXX" // (אם Analytics מופעל)
    };
    ```
    **אנו נשתמש בפרטים אלו בקובץ `src/firebaseConfig.ts`.**

## 3. אינטגרציה של הקוד בצד הלקוח (Frontend)

### 3.1. התקנת Firebase SDK

בטרמינל, בתיקיית השורש של פרויקט ה-React שלך, הרץ:
```bash
npm install firebase
# או אם אתה משתמש ב-Yarn:
# yarn add firebase
```

### 3.2. עדכון קובץ התצורה `src/firebaseConfig.ts`

פתח את הקובץ `src/firebaseConfig.ts` בפרויקט שלך. הקובץ כבר מכיל מבנה עבור `firebaseConfig`.
**החלף את ערכי ה-Placeholder** (כמו `"YOUR_API_KEY"`) בערכים האמיתיים שהעתקת מהקונסולה של Firebase בשלב 2.3.

```typescript
// src/firebaseConfig.ts

// ... (imports)

// ================================================================================================
// TODO: החלף את הערכים הבאים בפרטי התצורה של פרויקט ה-Firebase שלך!
// ================================================================================================
const firebaseConfig = {
  apiKey: "הכנס_כאן_את_הערך_שלך", // <-- החלף כאן!
  authDomain: "הכנס_כאן_את_הערך_שלך", // <-- החלף כאן!
  projectId: "הכנס_כאן_את_הערך_שלך", // <-- החלף כאן!
  storageBucket: "הכנס_כאן_את_הערך_שלך", // <-- החלף כאן!
  messagingSenderId: "הכנס_כאן_את_הערך_שלך", // <-- החלף כאן!
  appId: "הכנס_כאן_את_הערך_שלך", // <-- החלף כאן!
  measurementId: "הכנס_כאן_את_הערך_שלך" // אופציונלי
};
// ================================================================================================
// סוף אזור ההגדרות שיש לעדכן
// ================================================================================================

// ... (שאר הקוד בקובץ - אתחול Firebase)
export { app, auth, db, functions, analytics };
```

**חשוב:** לפרודקשן, מומלץ מאוד לטעון ערכים אלו ממשתני סביבה (למשל, באמצעות קובץ `.env` בפרויקט Vite) ולא לשמור אותם ישירות בקוד.

### 3.3. מיקום קבצים חדשים ומעודכנים

השינויים שקיבלת כוללים קבצים חדשים ועדכונים לקבצים קיימים. ודא שהם ממוקמים נכון במבנה התיקיות של הפרויקט שלך (בדרך כלל תחת תיקיית `src`). הקבצים העיקריים שהשתנו או נוספו בהקשר Firebase הם:
*   `src/firebaseConfig.ts` (חדש/מעודכן)
*   `src/services/authService.ts` (מעודכן משמעותית)
*   `src/services/jobService.ts` (מעודכן משמעותית)
*   `src/services/notificationService.ts` (מעודכן, אך עדיין דורש התאמות ל-Firestore listeners ל-realtime)
*   `src/services/chatService.ts` (מעודכן, אך עדיין דורש התאמות ל-Firestore listeners ל-realtime)
*   `src/contexts/AuthContext.tsx` (מעודכן לשימוש ב-Firebase Auth)
*   `src/App.tsx` (עדכונים קלים לבדיקת הרשאות admin)
*   `src/pages/AdminDashboardPage.tsx` (בדיקת הרשאות admin)
*   `src/types.ts` (ייתכנו עדכונים קלים לשדות כמו `role` ב-`User`)

## 4. הגדרת Firestore Database

### 4.1. יצירת מסד נתונים

אם לא עשית זאת בשלב 2.2, עבור לקונסולת Firebase, נווט אל `Build > Firestore Database` ולחץ על "Create database". בחר Production mode ומיקום.

### 4.2. מבנה נתונים (Collections)

הקוד מניח את קיומם של האוספים (collections) הבאים ב-Firestore:

*   `users`: לאחסון פרופילי משתמשים (כולל שדה `role`, `isBlocked`, `canChat`).
*   `jobs`: לאחסון מודעות העבודה (כולל שדות אופציונליים כמו `isFlagged`, `flagReason`).
*   `notifications`: לאחסון התראות מערכת והתראות על משרות.
*   `chatThreads`: לאחסון המטא-דאטה של שיחות צ'אט.
*   `chat_messages_THREADID`: אוספים נפרדים לכל שיחה, כאשר `THREADID` הוא מזהה השיחה.
*   `job_alert_preferences`: לאחסון העדפות התראות המשתמשים.

השדות בכל document אמורים להתאים לממשקים המוגדרים ב-`src/types.ts`.

### 4.3. חוקי אבטחה (Firestore Security Rules) - קריטי!

זהו אחד השלבים החשובים ביותר לאבטחת המידע שלך. **חוקי ברירת המחדל של Production mode אינם מאפשרים קריאה או כתיבה למסד הנתונים.** עליך להגדיר חוקים שיאפשרו למשתמשים לבצע את הפעולות הנדרשות, בהתאם להרשאותיהם.

עבור אל `Build > Firestore Database > Rules` בקונסולת Firebase.

### 4.3.1 חוקי אבטחה מבוססי תפקידים (Role-Based Security Rules)

להלן דוגמה מורחבת לחוקי אבטחה המשתמשים בשדה `role` במסמכי המשתמשים כדי לאכוף הרשאות:

```firestore-rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // --- Helper Functions ---
    // בדיקה אם המשתמש המאומת הוא בעל ה-UID הנתון
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // בדיקה אם למשתמש המאומת יש תפקיד מסוים
    // מניחה שקיים אוסף 'users' עם שדה 'role' בכל מסמך משתמש
    function hasRole(roleName) {
      return request.auth != null && exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == roleName;
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function isModerator() {
      return hasRole('moderator');
    }
    
    function isSupport() {
      return hasRole('support');
    }

    function isUser() {
      return hasRole('user');
    }
    
    // בדיקה אם המשתמש אינו חסום
    function isNotBlocked(userId) {
        return request.auth != null && exists(/databases/$(database)/documents/users/$(userId)) &&
               get(/databases/$(database)/documents/users/$(userId)).data.isBlocked == false;
    }
    
    // בדיקה אם למשתמש מותר לשוחח בצ'אט
    function canUserChat(userId) {
        return request.auth != null && exists(/databases/$(database)/documents/users/$(userId)) &&
               get(/databases/$(database)/documents/users/$(userId)).data.canChat == true;
    }


    // --- Users Collection ---
    match /users/{userId} {
      // כל משתמש מאומת (שאינו חסום) יכול לקרוא פרופילים (למשל, להצגת שם מפרסם מודעה)
      allow read: if request.auth != null && isNotBlocked(request.auth.uid);
      
      // משתמש יכול ליצור רק את הפרופיל של עצמו
      allow create: if isOwner(userId) &&
                       request.resource.data.email == request.auth.token.email && // ודא שהאימייל תואם
                       request.resource.data.role == 'user' && // כפה תפקיד ברירת מחדל
                       request.resource.data.isBlocked == false &&
                       request.resource.data.canChat == true;

      // משתמש יכול לעדכן רק את הפרופיל של עצמו, ולא את התפקיד או סטטוס החסימה/צ'אט
      allow update: if isOwner(userId) &&
                       !(request.resource.data.role != resource.data.role) &&
                       !(request.resource.data.isBlocked != resource.data.isBlocked) &&
                       !(request.resource.data.canChat != resource.data.canChat);
      
      // מנהל-על (admin) יכול לבצע כל פעולה על כל פרופיל משתמש
      allow write: if isAdmin(); // 'write' כולל create, update, delete

      // מנהל-על יכול למחוק משתמשים (למעט את עצמו דרך הכלל הזה)
      allow delete: if isAdmin() && request.auth.uid != userId;
    }

    // --- Jobs Collection ---
    match /jobs/{jobId} {
      // כל אחד (גם לא מאומת) יכול לקרוא משרות
      allow read: if true;
      
      // משתמש מאומת (שאינו חסום) יכול ליצור משרה
      allow create: if request.auth != null && isNotBlocked(request.auth.uid) &&
                       request.resource.data.postedBy.id == request.auth.uid; // ודא שהמפרסם הוא המשתמש הנוכחי

      // עדכון משרה:
      // 1. בעל המשרה (שאינו חסום) יכול לעדכן את המשרה שלו.
      // 2. מודרטור יכול לעדכן משרה (למשל, לסמן כבעייתית, אך לא לשנות את המפרסם).
      // 3. מנהל-על יכול לעדכן כל משרה.
      allow update: if request.auth != null && isNotBlocked(request.auth.uid) &&
                       ( (isOwner(resource.data.postedBy.id) && request.resource.data.postedBy.id == resource.data.postedBy.id) || 
                         (isModerator() && request.resource.data.postedBy.id == resource.data.postedBy.id) || 
                         isAdmin() );
      
      // מחיקת משרה:
      // 1. בעל המשרה יכול למחוק.
      // 2. מודרטור יכול למחוק.
      // 3. מנהל-על יכול למחוק.
      allow delete: if request.auth != null && isNotBlocked(request.auth.uid) && 
                       (isOwner(resource.data.postedBy.id) || isModerator() || isAdmin());
    }

    // --- Notifications Collection ---
    match /notifications/{notificationId} {
      // משתמש מאומת (שאינו חסום) יכול לקרוא/לכתוב/למחוק רק את ההתראות שלו
      allow read, write, delete: if request.auth != null && isNotBlocked(request.auth.uid) && 
                                     request.resource.data.userId == request.auth.uid;
      // מנהל-על יכול לקרוא התראות (לצורכי ניטור, אך לא לכתוב/למחוק התראות של אחרים ישירות דרך כלל זה)
      allow get: if isAdmin();
    }
    
    // --- Job Alert Preferences Collection ---
    match /job_alert_preferences/{preferenceId} {
      allow read, write, delete: if request.auth != null && isNotBlocked(request.auth.uid) &&
                                     request.resource.data.userId == request.auth.uid;
      allow get: if isAdmin();
    }

    // --- Chat Threads Collection ---
    match /chatThreads/{threadId} {
      // משתתף בשיחה (שאינו חסום ויכול לשוחח) יכול לקרוא ולעדכן (lastMessage, unreadCounts)
      allow read, update: if request.auth != null && 
                             request.auth.uid in resource.data.participantIds &&
                             isNotBlocked(request.auth.uid) && 
                             canUserChat(request.auth.uid);
      
      // כל משתמש מאומת (שאינו חסום ויכול לשוחח) יכול ליצור שיחה
      allow create: if request.auth != null && isNotBlocked(request.auth.uid) && canUserChat(request.auth.uid) &&
                       request.auth.uid in request.resource.data.participantIds; // ודא שהיוצר הוא חלק מהמשתתפים
      
      // מנהל-על יכול לקרוא/לעדכן/למחוק שיחות (לצורכי ניטור/מחיקה)
      allow read, update, delete: if isAdmin(); 
    }

    // --- Chat Messages Subcollection ---
    // This assumes messages are subcollections of chatThreads. If they are top-level, adjust path.
    // Example path if messages are top-level: /chat_messages_{threadId}/{messageId}
    match /chatThreads/{threadId}/messages/{messageId} { // If subcollection
    // match /chat_messages_{threadId}/{messageId} { // If top-level collection
      // משתתף בשיחה (שאינו חסום ויכול לשוחח) יכול לקרוא הודעות בשיחה
      allow read: if request.auth != null &&
                     request.auth.uid in get(/databases/$(database)/documents/chatThreads/$(threadId)).data.participantIds &&
                     isNotBlocked(request.auth.uid) &&
                     canUserChat(request.auth.uid);

      // משתתף בשיחה (שאינו חסום ויכול לשוחח) יכול ליצור הודעה, ורק בתור עצמו
      allow create: if request.auth != null &&
                       request.auth.uid in get(/databases/$(database)/documents/chatThreads/$(threadId)).data.participantIds &&
                       request.resource.data.senderId == request.auth.uid &&
                       isNotBlocked(request.auth.uid) &&
                       canUserChat(request.auth.uid);
      
      // מנהל-על יכול לקרוא/למחוק הודעות (לצורכי ניטור/מחיקה)
      allow read, delete: if isAdmin();
      // בדרך כלל לא מאפשרים עדכון הודעות לאחר שליחה, אלא אם כן יש לוגיקה ספציפית (למשל, isRead)
      // allow update: if ... 
    }
  }
}
```

**הסבר לחוקים לדוגמה:**
*   **פונקציות עזר:** `isOwner`, `hasRole`, `isAdmin`, `isModerator`, `isNotBlocked`, `canUserChat` מפשטות את כתיבת החוקים.
*   **`users`:**
    *   קריאה: כל משתמש מאומת ולא חסום.
    *   יצירה: רק המשתמש עצמו, עם תפקיד 'user' וברירות מחדל ל-`isBlocked` ו-`canChat`.
    *   עדכון: רק המשתמש עצמו, אך לא יכול לשנות את התפקיד, `isBlocked` או `canChat` של עצמו.
    *   כתיבה מלאה (כולל שינוי תפקיד, חסימה): רק `admin`.
    *   מחיקה: רק `admin` (ולא את עצמו).
*   **`jobs`:**
    *   קריאה: כולם.
    *   יצירה: משתמש מאומת ולא חסום, והוא המפרסם.
    *   עדכון: בעל המשרה (אם לא חסום), `moderator` (לא יכול לשנות מפרסם), או `admin`.
    *   מחיקה: בעל המשרה, `moderator`, או `admin`.
*   **`notifications` / `job_alert_preferences`:** משתמש יכול לגשת רק לנתונים שלו. `admin` יכול לקרוא.
*   **`chatThreads` / `messages`:**
    *   רק משתתפים בשיחה (שאינם חסומים ויכולים לשוחח) יכולים לקרוא ולשלוח הודעות.
    *   `admin` יכול לקרוא, לעדכן (מטא-דאטה של Thread) ולמחוק שיחות/הודעות.
    *   חשוב לוודא שמשתמש חסום מצ'אט (`canChat: false`) לא יוכל לשלוח הודעות חדשות.

**אזהרה:** הדוגמה לעיל היא בסיס מורחב. עליך להתאים אותה בקפידה לצרכים המדויקים של האפליקציה שלך ולוודא שאין פרצות אבטחה. לדוגמה, שינוי תפקיד משתמש הוא פעולה רגישה מאוד - מומלץ לבצע אותה דרך Firebase Function שתבצע ולידציות נוספות.

## 5. הגדרת Firebase Hosting

### 5.1. התקנת Firebase CLI והתחברות

אם עדיין לא התקנת:
```bash
npm install -g firebase-tools
```
לאחר מכן, התחבר לחשבון Google שלך:
```bash
firebase login
```

### 5.2. אתחול Firebase בפרויקט המקומי

בטרמינל, בתיקיית השורש של פרויקט ה-React שלך, הרץ:
```bash
firebase init
```
1.  בחר "Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys".
2.  בחר "Use an existing project" ובחר את הפרויקט שיצרת בקונסולה.
3.  **What do you want to use as your public directory?** הזן `dist` (אם אתה משתמש ב-Vite, שזו תיקיית ה-build הסטנדרטית) או `build` (אם אתה משתמש ב-Create React App).
4.  **Configure as a single-page app (rewrite all urls to /index.html)?** הזן `Yes` (או `y`). זה חשוב כדי שהניווט ב-React יעבוד כראוי.
5.  **Set up automatic builds and deploys with GitHub?** בחר `No` (או `n`) לעת עתה (אפשר להגדיר מאוחר יותר).

פעולה זו תיצור שני קבצים בשורש הפרויקט שלך:
*   `.firebaserc`: מכיל את מזהה הפרויקט.
*   `firebase.json`: מכיל את הגדרות ה-Hosting. ודא שהוא נראה בערך כך:

    ```json
    {
      "hosting": {
        "public": "dist", // או "build" אם אתה משתמש ב-CRA
        "ignore": [
          "firebase.json",
          "**/.*",
          "**/node_modules/**"
        ],
        "rewrites": [
          {
            "source": "**",
            "destination": "/index.html"
          }
        ]
      }
    }
    ```

### 5.3. בניית האפליקציה לפריסה

לפני כל פריסה, עליך לבנות את גרסת הפרודקשן של אפליקציית ה-React שלך:
```bash
npm run build
# או אם אתה משתמש ב-Yarn:
# yarn build
```
פעולה זו תיצור את הקבצים הסטטיים בתיקיית `dist` (או `build`).

### 5.4. פריסה (Deploy)

לאחר שהאפליקציה בנויה, פרסם אותה ל-Firebase Hosting:
```bash
firebase deploy --only hosting
```
לאחר סיום הפריסה, ה-CLI יספק לך את הקישור לאתר הפרוס שלך (לדוגמה, `your-project-id.web.app`).

## 6. Firebase Functions (לוגיקת צד-שרת - המשך פיתוח)

הקוד הנוכחי מתמקד בצד הלקוח. עם זאת, רבות מהתכונות המתקדמות שצוינו בפרומפט המקורי דורשות לוגיקה בצד השרת, אותה ניתן לממש באמצעות Firebase Functions:

*   **שליחת וואטסאפ/SMS אוטומטית (Twilio, Wati וכו'):** אינטגרציה עם שירותים אלו צריכה להתבצע דרך פונקציה כדי לא לחשוף מפתחות API בצד הלקוח. הפונקציה יכולה להיות מופעלת על ידי טריגר מ-Firestore (למשל, כשנוספת התראה חדשה שדורשת שליחה) או להיקרא ישירות מהלקוח (Callable Function).
*   **שליחת מיילים (Gmail API, SendGrid):** בדומה לשליחת SMS, יש לבצע דרך פונקציה.
*   **ניהול הרשאות מתקדם:** שינוי `role` של משתמש צריך להתבצע על ידי פונקציה מאובטחת, לא ישירות מהלקוח.
*   **עיבוד נתונים מורכב:** אם יש צורך לעבד נתונים, ליצור סיכומים, או לבצע פעולות תחזוקה על מסד הנתונים.
*   **הפעלת התראות בפועל (לא רק יצירת רשומת Notification):** פונקציה יכולה להאזין לשינויים ב-`job_alert_preferences` וב-`jobs` כדי לשלוח את ההתראות בפועל באמצעים שנבחרו (אימייל, SMS וכו') דרך שירותים חיצוניים.
*   **מחיקת נתונים מקושרים (Cascading Deletes):** לדוגמה, בעת מחיקת משתמש (Auth trigger), פונקציה יכולה למחוק את כל המשרות, ההתראות והצ'אטים הקשורים אליו.

**הקמת Firebase Functions:**
1.  בטרמינל, בשורש הפרויקט: `firebase init functions`
2.  בחר שפה (TypeScript או JavaScript).
3.  כתוב את קוד הפונקציות שלך בתיקיית `functions` שנוצרה.
4.  פרוס את הפונקציות: `firebase deploy --only functions`.

## 7. אינטגרציות צד שלישי (Twilio, SendGrid וכו' - המשך פיתוח)

כאמור, אינטגרציות אלו ימומשו באמצעות Firebase Functions.

*   **מפתחות API:** יש לאחסן מפתחות API של שירותים חיצוניים בצורה מאובטחת, למשל באמצעות משתני סביבה של Firebase Functions:
    ```bash
    firebase functions:config:set twilio.sid="ACxxxx" twilio.token="yourtoken" sendgrid.key="SGxxxx"
    ```
    ולגשת אליהם בקוד הפונקציה באמצעות `functions.config().twilio.sid`.

*   **תבניות הודעה:** ניתן לאחסן תבניות הודעה ב-Firestore או ישירות בקוד הפונקציות.

## 8. בדיקות וצעדים הבאים

*   **בדיקה מקומית:** לאחר עדכון `src/firebaseConfig.ts`, הרץ את האפליקציה מקומית (`npm run dev`) ובדוק את כל התכונות: הרשמה, התחברות, פרסום משרה, צפייה במשרות, פרופיל, התראות וכו'. בדוק את הקונסולה של הדפדפן לשגיאות.
*   **בדיקה לאחר פריסה:** לאחר פריסה ל-Firebase Hosting, בדוק את האתר בכתובת שקיבלת.
*   **Firestore Security Rules:** המשך לפתח ולשפר את חוקי האבטחה שלך. השתמש ב-Simulator בקונסולת Firebase כדי לבדוק אותם.
*   **Firebase Functions:** התחל לפתח את הפונקציות הנדרשות למימוש התכונות המתקדמות.
*   **ניטור:** עקוב אחר השימוש באפליקציה דרך Firebase Analytics והתראות שגיאה (אם הוגדרו).

בהצלחה! זהו פרויקט מורכב, והמעבר ל-Firebase הוא צעד גדול שיאפשר לך לבנות אפליקציה חזקה וסקיילבילית.
