Installation

1. Clone the Repository

git clone https://github.com/your-username/online-messaging-system.git
cd online-messaging-system

2. Install Dependencies

npm install

3. Set Up the Database

Create a MySQL database and update config.js with your database credentials.

CREATE DATABASE messaging_system;

Run the migration scripts (if available) or manually create the required tables.

4. Start the Server

nodemon server.js

The server will start at http://localhost:5000

5. Start the Client (If using React.js)

cd client
npm install
npm start

```
API Endpoints
POST /signup → Register a new user

POST /login → Authenticate user


POST /reset-password → Reset password

POST /logout → Log out user

POST /send-message → Send a message

POST /upload-attachment → Uploads attachment of files or images

POST /get-messages → display the messages

POST /submit-feedback → Submit feedback

```

Contributing

Feel free to fork this repository and contribute. To contribute:

Fork the repo

Create a new branch (git checkout -b feature-branch)

Commit changes (git commit -m 'Add new feature')

Push to branch (git push origin feature-branch)

Open a Pull Request

Developed by Varun Kedlaya
