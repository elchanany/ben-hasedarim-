# בין הסדורים - אתר העבודות הזמניות

אתר React SPA לעבודות זמניות לציבור החרדי.

## 🚀 דיפלוי

הפרויקט מוכן לדיפלוי על Firebase Hosting ו-Vercel.

### 📦 התקנת תלויות

```bash
npm install
```

### 🔧 פיתוח מקומי

```bash
npm run dev
```

### 🏗️ בניית הפרויקט

```bash
npm run build
```

### 👀 תצוגה מקדימה

```bash
npm run preview
```

## 🌐 דיפלוי ל-Vercel

### דרך 1: דרך הממשק הגרפי
1. התחבר ל-[Vercel](https://vercel.com)
2. בחר "Import Project" ובחר את הריפוזיטורי
3. הגדר:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. לחץ "Deploy"

### דרך 2: דרך CLI
```bash
npm i -g vercel
vercel
```

## 🔥 דיפלוי ל-Firebase Hosting

### הכנה ראשונית
```bash
# התחברות ל-Firebase
npm run fb:login

# רשימת פרויקטים
firebase projects:list

# עדכון .firebaserc עם ה-Project ID שלך
# החלף "REPLACE_WITH_YOUR_PROJECT_ID" ב-.firebaserc
```

### דיפלוי
```bash
# בנייה ודיפלוי
npm run fb:deploy
```

### דיפלוי ידני
```bash
# בנייה
npm run build

# דיפלוי
firebase deploy --only hosting
```

## 📁 מבנה הפרויקט

```
├── dist/                 # Build output (Vite)
├── public/              # קבצים סטטיים
├── src/                 # קוד מקור
├── components/          # קומפוננטים
├── pages/              # דפים
├── firebase.json       # קונפיג Firebase
├── .firebaserc         # Firebase project config
├── vercel.json         # קונפיג Vercel
└── vite.config.ts     # קונפיג Vite
```

## ⚙️ הגדרות טכניות

### Vite Configuration
- **Build Output**: `dist/`
- **Build Command**: `vite build`
- **Preview**: `vite preview`

### SPA Routing
האפליקציה משתמשת ב-hash routing, אבל ה-rewrites מוגדרים בכל מקרה לביטחון נוסף.

### Firebase Hosting
- **Public Directory**: `dist`
- **Rewrites**: כל הנתיבים מופנים ל-`index.html`

### Vercel
- **Rewrites**: כל הנתיבים מופנים ל-`index.html`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

## 🛠️ סקריפטים זמינים

```bash
npm run dev          # פיתוח מקומי
npm run build        # בניית הפרויקט
npm run preview      # תצוגה מקדימה
npm run start        # הפעלה מקומית של build
npm run fb:login     # התחברות ל-Firebase
npm run fb:init      # אתחול Firebase hosting
npm run fb:deploy    # בנייה ודיפלוי ל-Firebase
```

## 📝 הערות חשובות

1. **Project ID**: החלף `REPLACE_WITH_YOUR_PROJECT_ID` ב-.firebaserc עם ה-Project ID שלך
2. **Environment Variables**: אם יש משתני סביבה, הגדר אותם בפלטפורמות הדיפלוי
3. **Domain**: לאחר דיפלוי, תוכל להגדיר domain מותאם אישית
4. **HTTPS**: שני הפלטפורמות מספקות HTTPS אוטומטית

## 🔗 קישורים שימושיים

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Vite Documentation](https://vitejs.dev/guide/)