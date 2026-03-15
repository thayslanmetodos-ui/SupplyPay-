import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./src/db.ts";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supplypay-secret-key";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json());

  // Middleware to authenticate JWT
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- AUTH ROUTES ---
  // Create default admin if not exists
  const createDefaultAdmin = async () => {
    const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
    if (!admin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      db.prepare(`
        INSERT INTO users (email, password, role, name, is_approved)
        VALUES ('admin@supplypay.com', ?, 'admin', 'Administrador', 1)
      `).run(hashedPassword);
      console.log("Default admin created: admin@supplypay.com / admin123");
    }
  };
  createDefaultAdmin();

  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, role, name, cpf, birthDate, bank, whatsapp } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = db.prepare(`
        INSERT INTO users (email, password, role, name, cpf, birth_date, bank, whatsapp, is_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(email, hashedPassword, role, name, cpf || null, birthDate || null, bank || null, whatsapp || null);
      
    const user = db.prepare("SELECT id, email, role, name, balance, level_points, is_blocked, is_approved FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user });
  } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.is_blocked) return res.status(403).json({ error: "Account blocked" });
    if (!user.is_approved && user.role !== 'admin') return res.status(403).json({ error: "PENDING_APPROVAL" });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  });

  app.get("/api/me", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, email, role, name, cpf, bank, whatsapp, status, balance, level_points, is_blocked, is_approved FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  app.delete("/api/me", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);
    res.json({ success: true });
  });

  // --- SUPPLIER ROUTES ---
  app.post("/api/supplier/toggle-status", authenticate, (req: any, res) => {
    const { status } = req.body;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.user.id);
    res.json({ success: true });
  });

  app.get("/api/supplier/transactions", authenticate, (req: any, res) => {
    const transactions = db.prepare(`
      SELECT t.*, u.name as operator_name 
      FROM transactions t 
      JOIN users u ON t.operator_id = u.id 
      WHERE t.supplier_id = ? 
      ORDER BY t.created_at DESC
    `).all(req.user.id);
    res.json(transactions);
  });

  // --- OPERATOR ROUTES ---
  app.get("/api/operator/available-cpfs", authenticate, (req: any, res) => {
    const cpfs = db.prepare(`
      SELECT id, name, bank, level_points 
      FROM users 
      WHERE role = 'supplier' AND status = 'ON' AND is_blocked = 0
    `).all();
    res.json(cpfs);
  });

  app.post("/api/operator/buy-cpf", authenticate, (req: any, res) => {
    const { supplierId } = req.body;
    const operator = db.prepare("SELECT balance FROM users WHERE id = ?").get(req.user.id) as any;
    const price = parseFloat(db.prepare("SELECT value FROM settings WHERE key = 'cpf_price'").get()?.value || "2.70");
    const feePercent = parseFloat(db.prepare("SELECT value FROM settings WHERE key = 'supplier_fee_percentage'").get()?.value || "0.5");

    if (operator.balance < price) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const supplier = db.prepare("SELECT status FROM users WHERE id = ?").get(supplierId) as any;
    if (supplier.status !== 'ON') {
      return res.status(400).json({ error: "Supplier no longer available" });
    }

    const supplierFee = price * feePercent;

    db.transaction(() => {
      // Deduct from operator
      db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(price, req.user.id);
      // Update supplier status to RESERVED (or just keep track via transaction)
      db.prepare("UPDATE users SET status = 'OFF' WHERE id = ?").run(supplierId);
      // Create transaction
      const result = db.prepare(`
        INSERT INTO transactions (operator_id, supplier_id, amount, supplier_fee, status)
        VALUES (?, ?, ?, ?, 'IN_USE')
      `).run(req.user.id, supplierId, price, supplierFee);
      
      // Update supplier points for level
      db.prepare("UPDATE users SET level_points = level_points + ? WHERE id = ?").run(supplierFee, supplierId);
      
      // Notify supplier
      io.to(`user_${supplierId}`).emit("notification", {
        type: "PURCHASE",
        message: "Seu CPF foi comprado! Verifique as solicitações.",
        transactionId: result.lastInsertRowid
      });
    })();

    res.json({ success: true });
  });

  app.get("/api/operator/active-cpfs", authenticate, (req: any, res) => {
    const activeCpfs = db.prepare(`
      SELECT t.*, u.name, u.cpf, u.bank, u.whatsapp
      FROM transactions t
      JOIN users u ON t.supplier_id = u.id
      WHERE t.operator_id = ? AND t.status = 'IN_USE'
    `).all(req.user.id);
    res.json(activeCpfs);
  });

  app.post("/api/operator/complete-withdrawal", authenticate, (req: any, res) => {
    const { transactionId, withdrawalAmount, pixKey, status } = req.body;
    // status should be 'COMPLETED' or 'FAILED'
    db.prepare(`
      UPDATE transactions 
      SET withdrawal_amount = ?, pix_key = ?, status = ? 
      WHERE id = ? AND operator_id = ?
    `).run(withdrawalAmount, pixKey, status || 'COMPLETED', transactionId, req.user.id);
    
    // If completed, we might want to release the supplier back to 'ON' status? 
    // Or maybe they stay 'OFF' until admin resets? 
    // Usually, once used, they might need a cooldown or manual reset.
    // For now, let's keep them 'OFF' or reset to 'ON' if failed.
    if (status === 'FAILED') {
      const trans = db.prepare("SELECT supplier_id FROM transactions WHERE id = ?").get(transactionId) as any;
      if (trans) {
        db.prepare("UPDATE users SET status = 'ON' WHERE id = ?").run(trans.supplier_id);
      }
    }
    
    res.json({ success: true });
  });

  app.post("/api/operator/add-balance", authenticate, (req: any, res) => {
    const { amount } = req.body;
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(amount, req.user.id);
    res.json({ success: true });
  });

  app.get("/api/operator/transactions", authenticate, (req: any, res) => {
    const transactions = db.prepare(`
      SELECT t.*, u.name as supplier_name, u.cpf as supplier_cpf
      FROM transactions t
      JOIN users u ON t.supplier_id = u.id
      WHERE t.operator_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);
    res.json(transactions);
  });

  // --- ADMIN ROUTES ---
  app.get("/api/admin/users", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT id, email, role, name, cpf, whatsapp, is_blocked, is_approved, balance FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users/:id/approve", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    db.prepare("UPDATE users SET is_approved = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/admin/stats", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const totalBalance = db.prepare("SELECT SUM(balance) as sum FROM users").get() as any;
    const pendingApprovals = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_approved = 0 AND role != 'admin'").get() as any;
    const totalTransactions = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as any;
    const totalVolume = db.prepare("SELECT SUM(amount) as sum FROM transactions WHERE status = 'COMPLETED'").get() as any;

    res.json({
      totalUsers: totalUsers.count,
      totalBalance: totalBalance.sum || 0,
      pendingApprovals: pendingApprovals.count,
      totalTransactions: totalTransactions.count,
      totalVolume: totalVolume.sum || 0
    });
  });

  app.post("/api/admin/toggle-block", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { userId, block } = req.body;
    db.prepare("UPDATE users SET is_blocked = ? WHERE id = ?").run(block ? 1 : 0, userId);
    res.json({ success: true });
  });

  app.get("/api/admin/settings", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  app.post("/api/admin/update-settings", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { settings } = req.body; // Array of {key, value}
    const update = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
    db.transaction(() => {
      for (const s of settings) {
        update.run(s.value, s.key);
      }
    })();
    res.json({ success: true });
  });

  app.post("/api/admin/bulk-add-cpfs", authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { cpfs } = req.body; // Array of { name, cpf, bank }
    
    if (!Array.isArray(cpfs)) return res.status(400).json({ error: "Invalid data" });

    const insert = db.prepare(`
      INSERT INTO users (email, password, role, name, cpf, bank, status, is_approved)
      VALUES (?, ?, 'supplier', ?, ?, ?, 'ON', 1)
    `);

    try {
      const hashedPassword = await bcrypt.hash("supplier123", 10);
      db.transaction(() => {
        for (const item of cpfs) {
          // Generate a unique dummy email
          const randomSuffix = Math.random().toString(36).substring(2, 7);
          const dummyEmail = `cpf_${item.cpf || randomSuffix}_${Date.now()}_${randomSuffix}@supplypay.internal`;
          insert.run(dummyEmail, hashedPassword, item.name, item.cpf, item.bank || 'Sistema');
        }
      })();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Socket.io connection handling
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
