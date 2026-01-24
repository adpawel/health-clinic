import { Request, Response, NextFunction } from 'express';

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore - zakładamy, że authenticateToken dodał już usera do requestu
    const userRole = req.user?.role;

    if (!userRole) {
        return res.status(403).json({ message: "Brak przypisanej roli." });
    }

    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: "Brak uprawnień do wykonania tej operacji." });
    }
  };
};