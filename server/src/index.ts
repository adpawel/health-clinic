import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io'; 
import dotenv from 'dotenv';
dotenv.config();
import { AuthController, authenticateToken } from './authController.js';
import { MongoDAO } from './dao/MongoDbDAO.js';
import { LowDbDAO } from './dao/LowDbDAO.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireRole } from './middleware/roleMiddleware.js';
import { AppointmentService } from './services/AppointmentService.js';
import { AbsenceService } from './services/AbsenceService.js';
import { AvailabilityService } from './services/AvailabilityService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../server_config.json');

const loadConfig = () => {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Błąd odczytu configu:", e);
    }
    return { appMode: 'CUSTOM_LOCAL' };
};

const saveConfig = (newConfig: any) => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
};

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",        
    methods: ["GET", "POST"],
    credentials: false  
  }
});

app.use(cors({
    origin: "*",  
    credentials: false  
}));
app.use(bodyParser.json());

let currentConfig = loadConfig();

const initDb = (mode: string) => {
    if (mode === 'CUSTOM_MONGO') return new MongoDAO();
    return new LowDbDAO();
};

export let db: MongoDAO | LowDbDAO = initDb(currentConfig.appMode);

let appointmentService = new AppointmentService(db, io);
let absenceService = new AbsenceService(db, io, appointmentService);
let availabilityService = new AvailabilityService(db, io);
const authController = new AuthController(db);

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  
  if (userId) {
      socket.join(userId);
      console.log(`User ${userId} dołączył do pokoju powiadomień.`);
  }

  socket.on('disconnect', () => {
    console.log(`Klient rozłączony: ${socket.id}`);
  });
});

app.get('/api/config/global', (req, res) => {
    const config = loadConfig();
    res.json(config);
});

app.post('/api/config/global', (req, res) => {
    const { appMode } = req.body;
    
    const newConfig = { ...loadConfig(), appMode };
    saveConfig(newConfig);
    currentConfig = newConfig;

    if (appMode === 'CUSTOM_MONGO') {
        db = new MongoDAO();
        authController.updateDb(db);
    } else if (appMode === 'CUSTOM_LOCAL') {
        db = new LowDbDAO();
        authController.updateDb(db);
    }
    appointmentService = new AppointmentService(db, io);
    absenceService = new AbsenceService(db, io, appointmentService);
    availabilityService = new AvailabilityService(db, io);
    console.log(`[Server] Przełączono tryb na: ${appMode}`);
    
    io.emit('SYSTEM_MODE_CHANGED', { appMode });

    res.json({ success: true, mode: appMode });
});

// --- TRASY AUTH (PUBLICZNE) ---
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refreshToken);
app.post('/api/auth/logout', authController.logout);

app.get('/appointments', authenticateToken, requireRole(['patient', 'doctor', 'admin']), async (req, res) => {
  const doctorId = req.query.doctorId as string;
  const data = await db.getAppointments(doctorId);
  res.json(data);
});

app.post('/appointments', authenticateToken, requireRole(['patient', 'admin']), async (req, res) => {
  try {
    const id = await appointmentService.createAppointment(req.body);
    res.json({ id });
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
});

app.delete('/appointments/:id', authenticateToken, requireRole(['patient', 'doctor', 'admin']), async (req, res) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const userRole = req.user.role;

  try {
      await appointmentService.cancelAppointment(id, userId, userRole);
      res.sendStatus(200);
  } catch (e: any) {
      console.error(e);
      res.status(400).json({ message: e.message });
  }
});

app.post('/appointments/pay', authenticateToken,  requireRole(['patient', 'doctor', 'admin']), async (req, res) => {
  const { ids } = req.body;
  if (Array.isArray(ids)) {
    await db.markAppointmentsAsPaid(ids);
    res.sendStatus(200);
  } else {
    res.status(400).send("Invalid body: ids array required");
  }
});

app.post('/appointments/:id/pay', authenticateToken, requireRole(['patient']), async (req, res) => {
  const { id } = req.params;
  // @ts-ignore
  const userId = req.user.id;

  try {
      const result = await appointmentService.payWithWallet(id, userId);
      res.json(result);
  } catch (e: any) {
      console.error(e);
      res.status(400).json({ message: e.message });
  }
});

app.get('/absences', authenticateToken, requireRole(['patient', 'doctor', 'admin']), async (req, res) => {
  const doctorId = req.query.doctorId as string;
  const data = await db.getAbsences(doctorId);
  res.json(data);
});

app.post('/absences', authenticateToken, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
      const id = await absenceService.createAbsence(req.body);
      res.json({ id });
  } catch (e: any) {
      console.error(e);
      res.status(400).json({ message: e.message });
  }
});

app.get('/availabilities', authenticateToken, requireRole(['patient', 'doctor', 'admin']), async (req, res) => {
  const doctorId = req.query.doctorId as string;
  const data = await db.getDoctorAvailability(doctorId);
  res.json(data);
});

app.post('/availabilities', authenticateToken, requireRole(['doctor', 'admin']), async (req, res) => {
  try {
    const id = await availabilityService.createAvailability(req.body);
    res.json({ id });
  } catch (e: any) {
    console.error(e);
    res.status(400).json({ message: e.message });
  }
});

app.get('/doctors', async (req, res) => {
  const data = await db.getDoctors();
  res.json(data);
});

app.get('/doctors/search', authenticateToken, async (req, res) => {
  const email = req.query.email as string;
  const id = await db.findDoctorByEmail(email);
  if (id) {
    res.json({ id });
  } else {
    res.status(404).send("Doctor not found");
  }
});

app.post('/doctors', authenticateToken, requireRole(['admin']), async (req, res) => {
  const id = await db.saveDoctor(req.body);
  res.json({ id });
});

app.delete('/doctors/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  await db.deleteDoctor(req.params.id);
  res.sendStatus(200);
});

app.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const dbUsers = await db.getUsers();
  
  const safeUsers = dbUsers.map(u => {
      const { password, activeRefreshToken, ...safe } = u;
      return safe;
  });
  
  res.json(safeUsers);
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    // @ts-ignore
    const userId = req.user.id;

    const user = await db.findUserById(userId);
    if (!user) {
        return res.status(404).json({ message: "Użytkownik nie istnieje." });
    }
    const { password, activeRefreshToken, ...safeUser } = user;
    res.json(safeUser);
});

app.patch('/users/:id/ban', authenticateToken, requireRole(['admin']), async (req, res) => {
  const isBanned = req.body.isBanned;
  await db.toggleUserBan(req.params.id, isBanned);
  res.sendStatus(200);
});
  
app.get('/config/persistence', async (req, res) => {
  const mode = await db.getPersistenceMode();
  res.json({ mode });
});

app.post('/config/persistence', authenticateToken, requireRole(['admin']), async (req, res) => {
  const newMode = req.body.mode;
  
  await db.setPersistenceMode(newMode);
  
  if (newMode === 'NONE' || newMode === 'SESSION') {
      console.log(`Zmiana trybu na ${newMode} - unieważniam wszystkie stare sesje.`);
      await db.clearAllRefreshTokens();
  }

  res.sendStatus(200);
});

app.get('/doctors/:doctorId/reviews', async (req, res) => {
  const { doctorId } = req.params;
  const reviews = await db.getReviewsByDoctorId(doctorId);

  reviews.sort((a: any, b: any) => b.createdAt - a.createdAt);
  res.json(reviews);
});

app.post('/reviews', authenticateToken, requireRole(['patient']), async (req, res) => {
  // @ts-ignore
  const patientId = req.user.id;
  // @ts-ignore
  const userRole = req.user.role;

  if (userRole !== 'patient') {
    return res.status(403).json({ message: "Tylko pacjenci mogą dodawać opinie." });
  }

  const { doctorId, rating, comment, patientName } = req.body;

  const existingReview = await db.findReviewByPatientAndDoctor(patientId, doctorId);
  if (existingReview) {
    return res.status(409).json({ message: "Już oceniłeś tego lekarza." });
  }

  const newReview = await db.addReview({
    doctorId,
    patientId,
    patientName,
    rating,
    comment
  });

  res.status(201).json(newReview);
});

app.put('/reviews/:reviewId', authenticateToken, requireRole(['patient']), async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;
  // @ts-ignore
  const userId = req.user.id;

  const review = await db.findReviewById(reviewId);
  if (!review) return res.status(404).json({ message: "Opinia nie istnieje" });

  if (review.patientId !== userId) {
    return res.status(403).json({ message: "Nie możesz edytować cudzej opinii" });
  }

  await db.updateReview(reviewId, { rating, comment });
  res.json({ status: 'success' });
});

app.delete('/reviews/:reviewId', authenticateToken, requireRole(['patient', 'admin']), async (req, res) => {
  const { reviewId } = req.params;
  // @ts-ignore
  const userId = req.user.id;

  const review = await db.findReviewById(reviewId);
  if (!review) return res.status(404).json({ message: "Opinia nie istnieje" });

  if (review.patientId !== userId) {
    return res.status(403).json({ message: "Nie możesz usunąć cudzej opinii" });
  }

  await db.deleteReview(reviewId);
  res.json({ status: 'success' });
});

server.listen(PORT, () => {
  console.log(`Backend (HTTP + WebSocket) działa`);
});