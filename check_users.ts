
import db from './src/db.ts';
const users = db.prepare("SELECT email FROM users").all();
console.log("Registered users:", JSON.stringify(users, null, 2));
