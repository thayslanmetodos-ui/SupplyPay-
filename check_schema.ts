
import db from './src/db.ts';
const schema = db.prepare("PRAGMA table_info(users)").all();
console.log("Users table schema:", JSON.stringify(schema, null, 2));
