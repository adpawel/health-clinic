import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LowDbDAO } from './dao/LowDbDAO.js';
import { DBUser, UserRole } from './types/types.js';
import { db } from './index.js';
import { MongoDAO } from './dao/MongoDbDAO.js';
import { Server } from 'socket.io';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

const ACCESS_EXPIRE = '1m';
const REFRESH_EXPIRE = '7d';

export class AuthController {
  private db: LowDbDAO | MongoDAO;
  private io: Server;

  constructor(db: LowDbDAO | MongoDAO, io: Server) {
    this.db = db;
    this.io = io;
  }

  public updateDb(newDb: LowDbDAO | MongoDAO) {
      this.db = newDb;
  }

  // Generowanie pary tokenów
  private generateTokens(user: any) {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRE }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: REFRESH_EXPIRE }
    );
    return { accessToken, refreshToken };
  }

  register = async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, pesel, phoneNumber } = req.body;

    const existingUser = await this.db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Użytkownik o tym emailu już istnieje." });
    }

    const linkedDoctorId = await this.db.findDoctorByEmail(email);
    let assignedRole: UserRole = 'patient';

    if (linkedDoctorId) {
        assignedRole = 'doctor';

        // Musimy pobrać pełne dane lekarza z bazy
        const doctorProfile = await this.db.findDoctorById(linkedDoctorId);
        if (doctorProfile) {
            const inputFirst = firstName.trim().toLowerCase();
            const inputLast = lastName.trim().toLowerCase();
            const docFirst = doctorProfile.firstName.trim().toLowerCase();
            const docLast = doctorProfile.lastName.trim().toLowerCase();

            if (inputFirst !== docFirst || inputLast !== docLast) {
                return res.status(400).json({ 
                    message: `Błąd weryfikacji tożsamości. Email jest przypisany do lekarza: ${doctorProfile.firstName} ${doctorProfile.lastName}. Wprowadź poprawne dane.` 
                });
            }
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: DBUser = {
      email,
      id: "",
      password: hashedPassword,
      firstName,
      lastName,
      role: assignedRole,
      pesel: pesel || "",
      phoneNumber: phoneNumber || "",
      isBanned: false,
      activeRefreshToken: null,
      doctorId: linkedDoctorId || undefined,
    };

    const id = await this.db.saveUser(newUser);
    
    const userForToken = { ...newUser, id };
    const tokens = this.generateTokens(userForToken);
    
    await this.db.updateUserRefreshToken(id, tokens.refreshToken);

    res.json({ 
        user: { 
            phoneNumber: phoneNumber,
            pesel: pesel,
            id, 
            email, 
            role: assignedRole, 
            firstName, 
            lastName,
            doctorId: linkedDoctorId || undefined 
        }, 
        ...tokens 
    });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    // 1. Pobieramy usera z bazy (to jest DBUser, ma pole password)
    const user = await this.db.findUserByEmail(email);

    if (!user) return res.status(400).json({ message: "Błąd logowania." });

    // 2. Weryfikacja hasła (bcrypt porównuje tekst z hashem z bazy)
    if (!user.password) {
        return res.status(400).json({ message: "Użytkownik zewnętrzny (brak hasła lokalnego)." });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Błąd logowania." });

    // 3. Generujemy tokeny
    const tokens = this.generateTokens(user);
    await this.db.updateUserRefreshToken(user.id, tokens.refreshToken);
    await this.db.updateUserSessionToken(user.id, tokens.accessToken);

    this.io.to(user.id).emit('SESSION_CHANGED', { 
        validAccessToken: tokens.accessToken,
        reason: 'NEW_LOGIN'
    });

    const { password: _, activeRefreshToken: __, ...safeUser } = user;

    res.json({ 
        user: safeUser, 
        ...tokens 
    });
  };

  refreshToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token) return res.sendStatus(401);

    jwt.verify(token, REFRESH_SECRET, async (err: any, decoded: any) => {
      if (err) return res.sendStatus(403);
      // 2. Weryfikacja w bazie (Single Session)
      // Musimy sprawdzić, czy ten token jest tym "aktywnym" w bazie
      const users = await this.db.getUsers();
      // @ts-ignore
      const user = users.find(u => u.id === decoded.id);

      if (!user || user.activeRefreshToken !== token) {
        // Ktoś zalogował się w innym oknie -> ten token jest spalony
        return res.status(403).json({ message: "Sesja wygasła (zalogowano na innym urządzeniu)." });
      }

      // 3. Generuj nowy Access Token (Refresh Token zostaje ten sam, lub można go też rotować)
      // W tym przykładzie rotujemy tylko Access Token
      const accessToken = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRE }
      );

      await this.db.updateUserSessionToken(user.id, accessToken);

      const { password: _, activeRefreshToken: __, ...safeUser } = user;

      res.json({ 
        accessToken,
        user: safeUser
      });
    });
  };

  // --- WYLOGOWANIE ---
  logout = async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (userId) {
        await this.db.updateUserRefreshToken(userId, null);
        await this.db.updateUserSessionToken(userId, null);

        this.io.to(userId).emit('SESSION_CHANGED', { 
            validAccessToken: null,
            reason: 'LOGOUT'
        });
    }
    res.sendStatus(204);
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, ACCESS_SECRET, async (err: any, decoded: any) => {
    if (err) return res.sendStatus(403);

    const user = await db.findUserById(decoded.id);

    if (!user) return res.sendStatus(403);

    if (user.activeAccessToken && user.activeAccessToken !== token) {
        console.log(`[Security] Odrzucono sesję użytkownika ${user.email}. Nowe logowanie wykryte.`);
        return res.status(403).json({ message: "Zalogowano na innym urządzeniu." });
    }

    // @ts-ignore
    req.user = user;
    next();
  });
};