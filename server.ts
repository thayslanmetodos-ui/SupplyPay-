import express from "express";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { sendEmail, emailTemplates } from "./server/services/emailService.js";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Load Firebase config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

// Initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    // Initialize with default credentials from the environment
    admin.initializeApp();
  }
} catch (err) {
  console.error('Error initializing Firebase Admin:', err);
}

// Explicitly use the database ID from the config
const firestore = getFirestore(firebaseConfig.firestoreDatabaseId);

async function logEmail(to: string, subject: string, html: string, type: string) {
  try {
    await firestore.collection('sent_emails').add({
      to,
      subject,
      html,
      type,
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      status: 'success'
    });
  } catch (err) {
    console.error('Failed to log email. Project:', firebaseConfig.projectId, 'Database:', firebaseConfig.firestoreDatabaseId, 'Error:', err);
  }
}

async function getTemplate(type: string, defaults: { subject: string, html: string }) {
  try {
    const docRef = firestore.collection('email_templates').doc(type);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      return {
        subject: data?.subject || defaults.subject,
        html: data?.html || defaults.html
      };
    }
  } catch (err) {
    console.error('Failed to fetch template. Project:', firebaseConfig.projectId, 'Database:', firebaseConfig.firestoreDatabaseId, 'Error:', err);
  }
  return defaults;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Email API Endpoints
  app.post("/api/email/registration", async (req, res) => {
    const { email, name } = req.body;
    const defaults = emailTemplates.registration(name);
    const template = await getTemplate('registration', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'registration');
    res.json({ success: true });
  });

  app.post("/api/email/approval", async (req, res) => {
    const { email, name } = req.body;
    const defaults = emailTemplates.approval(name);
    const template = await getTemplate('approval', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'approval');
    res.json({ success: true });
  });

  app.post("/api/email/transaction-confirmed", async (req, res) => {
    const { email, name, amount, transactionId } = req.body;
    const defaults = emailTemplates.transactionConfirmed(name, amount, transactionId);
    const template = await getTemplate('transaction-confirmed', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'transaction-confirmed');
    res.json({ success: true });
  });

  app.post("/api/email/password-reset", async (req, res) => {
    const { email, name, resetLink } = req.body;
    const defaults = emailTemplates.passwordReset(name, resetLink);
    const template = await getTemplate('password-reset', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'password-reset');
    res.json({ success: true });
  });

  app.post("/api/email/operation-request", async (req, res) => {
    const { email, name, operatorName, amount, fee } = req.body;
    const defaults = emailTemplates.operationRequest(name, operatorName, amount, fee);
    const template = await getTemplate('operation-request', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'operation-request');
    res.json({ success: true });
  });

  app.post("/api/email/status-active", async (req, res) => {
    const { email, name } = req.body;
    const defaults = emailTemplates.statusActive(name);
    const template = await getTemplate('status-active', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'status-active');
    res.json({ success: true });
  });

  app.post("/api/email/withdrawal-request", async (req, res) => {
    const { email, name, amount } = req.body;
    const defaults = emailTemplates.withdrawalRequest(name, amount);
    const template = await getTemplate('withdrawal-request', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'withdrawal-request');
    res.json({ success: true });
  });

  app.post("/api/email/withdrawal-completed", async (req, res) => {
    const { email, name, amount } = req.body;
    const defaults = emailTemplates.withdrawalCompleted(name, amount);
    const template = await getTemplate('withdrawal-completed', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'withdrawal-completed');
    res.json({ success: true });
  });

  app.post("/api/email/withdrawal-rejected", async (req, res) => {
    const { email, name, amount, reason } = req.body;
    const defaults = emailTemplates.withdrawalRejected(name, amount, reason);
    const template = await getTemplate('withdrawal-rejected', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'withdrawal-rejected');
    res.json({ success: true });
  });

  app.post("/api/email/new-message", async (req, res) => {
    const { email, name, senderName, message } = req.body;
    const defaults = emailTemplates.newMessage(name, senderName, message);
    const template = await getTemplate('new-message', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'new-message');
    res.json({ success: true });
  });

  app.post("/api/email/operation-accepted", async (req, res) => {
    const { email, name, supplierName } = req.body;
    const defaults = emailTemplates.operationAccepted(name, supplierName);
    const template = await getTemplate('operation-accepted', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'operation-accepted');
    res.json({ success: true });
  });

  app.post("/api/email/operation-rejected", async (req, res) => {
    const { email, name, supplierName } = req.body;
    const defaults = emailTemplates.operationRejected(name, supplierName);
    const template = await getTemplate('operation-rejected', defaults);
    await sendEmail(email, template.subject, template.html);
    await logEmail(email, template.subject, template.html, 'operation-rejected');
    res.json({ success: true });
  });

  // Socket.io for Real-time Chat
  const rooms = new Map(); // roomID -> messages[]

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomID) => {
      socket.join(roomID);
      console.log(`User ${socket.id} joined room ${roomID}`);
      
      // Send existing messages in the room
      const messages = rooms.get(roomID) || [];
      socket.emit("load_messages", messages);
    });

    socket.on("send_message", (data) => {
      const { roomID, message, sender, timestamp, senderRole } = data;
      const newMessage = { message, sender, timestamp, senderRole, id: Date.now().toString() };
      
      const messages = rooms.get(roomID) || [];
      messages.push(newMessage);
      rooms.set(roomID, messages);

      io.to(roomID).emit("receive_message", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
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
