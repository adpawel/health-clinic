import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LowDbDAO } from './dao/LowDbDAO.js';
import { DBUser } from './types/types.js';
import { db } from './index.js';
import { MongoDAO } from './dao/MongoDbDAO.js';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

// Czas życia tokenów
const ACCESS_EXPIRE = '1m';
const REFRESH_EXPIRE = '7d';

export class AuthController {
  private db: LowDbDAO | MongoDAO;

  constructor(db: LowDbDAO | MongoDAO) {
    this.db = db;
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

    // 1. Walidacja: Sprawdź czy user już istnieje
    // Używamy dedykowanej metody DAO zamiast pobierać całą bazę
    const existingUser = await this.db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Użytkownik o tym emailu już istnieje." });
    }

    // 2. LOGIKA LEKARZA (Pre-registration check)
    // Sprawdzamy, czy ten email znajduje się na liście lekarzy dodanych przez Admina
    const linkedDoctorId = await this.db.findDoctorByEmail(email);

    // Jeśli znaleziono ID lekarza -> rola 'doctor', w przeciwnym razie 'patient'
    const assignedRole = linkedDoctorId ? 'doctor' : 'patient';

    // 3. Haszowanie hasła
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
      doctorId: linkedDoctorId || undefined 
    };

    const id = await this.db.saveUser(newUser);
    
    // 6. Generowanie tokenów (automatyczne logowanie)
    // Ważne: Przekazujemy id i rolę do payloadu tokena
    const userForToken = { ...newUser, id };
    const tokens = this.generateTokens(userForToken);
    
    // 7. Single Session: Zapis refresh tokena
    await this.db.updateUserRefreshToken(id, tokens.refreshToken);

    // 8. Odsyłamy odpowiedź (BEZ HASŁA)
    // Jawnie konstruujemy obiekt zwrotny, żeby nie wysłać hasha przypadkiem
    res.json({ 
        user: { 
            phoneNumber: phoneNumber,
            pesel: pesel,
            // isBanned: isBanned,
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
      if (err) return res.sendStatus(403); // Token nieważny/wygasł

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

      res.json({ accessToken });
    });
  };

  // --- WYLOGOWANIE ---
  logout = async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (userId) {
        // Usuń token z bazy
        await this.db.updateUserRefreshToken(userId, null);
        await this.db.updateUserSessionToken(userId, null);
    }
    res.sendStatus(204);
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401); // Brak tokena -> Idź do logowania/refresh

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