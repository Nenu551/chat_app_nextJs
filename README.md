# AnonChat - Real-time Anonymous Chat Room

AnonChat is a web application built using **Next.js (App Router, JavaScript)**, **Tailwind CSS**, and **Firebase Realtime Database**. The app requires no custom backend, API routes, or sign-ups; readers and writers interact with the database client-side using the Firebase JS SDK.

## Features
- **URL-based Room Creation**: Open a URL like `/my-awesome-room` to immediately join or create that chat room.
- **Real-time Synchronization**: Receive and display new messages instantly without refreshing.
- **Anonymous Access**: Connect instantly without registering. Choose a custom name or proceed under an automatically generated temporary handle.
- **Sleek, Modern Design**: Fully responsive, mobile-first design system with support for both light and dark modes.
- **Database Security Rules**: Validates message attributes (sender, text, and timestamp) directly inside the database, restricting access elsewhere.

---

## Getting Started

### Prerequisites
- Node.js (v18.x or newer)
- npm or yarn

### Installation
1. Clone the repository and navigate into the folder:
   ```bash
   cd Real_time_Chat_app
   ```
2. Install the project dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template and rename it:
   ```bash
   cp .env.local.example .env.local
   ```
4. Fill in the variables in `.env.local` using credentials from your Firebase Console.

### Running Locally
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Open multiple windows (or an incognito session) to test real-time synchronization.

---

## Firebase Configuration

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the instructions to create a new project.
3. Click the Web icon (`</>`) in the project overview page to register a new Web App. Copy the configurations.

### 2. Enable Realtime Database
1. In the Firebase Sidebar, click **Realtime Database** (under Build).
2. Click **Create Database**, select a region close to your users, and start in **Locked Mode**.
3. Under the **Rules** tab, copy the rules from `firebase-rules.json` in the project root and paste them:
   ```json
   {
     "rules": {
       "rooms": {
         "$roomId": {
           "messages": {
             ".read": "true",
             ".write": "true",
             "$messageId": {
               ".validate": "newData.hasChildren(['sender', 'text', 'timestamp'])",
               "sender": {
                 ".validate": "newData.isString() && newData.val().length > 0"
               },
               "text": {
                 ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 2000"
               },
               "timestamp": {
                 ".validate": "newData.isNumber()"
               },
               "$other": {
                 ".validate": false
               }
             }
           },
           "$other": {
             ".validate": false
           }
         }
       },
       "$other": {
         ".read": false,
         ".write": false
       }
     }
   }
   ```
4. Click **Publish** to save changes.

---

## Netlify Deployment

1. Push your code repository to GitHub, GitLab, or Bitbucket.
2. Log in to [Netlify](https://www.netlify.com/) and click **Add new site** -> **Import an existing project**.
3. Link your repository. Netlify will auto-detect the configuration using the `netlify.toml` file:
   - **Build Command**: `npm run build`
   - **Publish directory**: `.next`
4. Expand **Advanced build settings** and click **Add environment variables**. Add the following variables with credentials from your Firebase project:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Click **Deploy site**. Netlify will build the Next.js app and trigger the deploy. Since `output: 'export'` is not used, Netlify's Next.js Runtime handles the dynamic `/[roomId]` routes automatically!
