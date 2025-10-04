import { Request, Response, NextFunction } from 'express';
import Staff from '../models/staff.model';
import { signToken } from '../utils/jwt';
import { catchAsync } from '../utils/catch-async';

export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Select password explicitly
    const staff = await Staff.findOne({ email }).select('+password');

    if (!staff || !(await staff.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!staff.isActive) {
      return res.status(403).json({
        message: "Account is inactive. Please contact the administrator.",
      });
    }

    const token = signToken(staff.id, staff.role, staff.clinicId as string);

    res.status(200).json({
      status: "success",
      token,
      user: staff.getPublicProfile(),
    });
  }
);
