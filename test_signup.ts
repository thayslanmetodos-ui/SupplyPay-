
import db from './src/db.ts';
import bcrypt from 'bcryptjs';

async function testSignup() {
  const email = "test@example.com";
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    db.prepare(`
      INSERT INTO users (email, password, role, name, whatsapp, is_approved)
      VALUES (?, ?, 'supplier', 'Test User', '11999999999', 0)
    `).run(email, hashedPassword);
    console.log("Signup successful");
  } catch (err) {
    console.error("Signup failed:", err);
  }
}

testSignup();
