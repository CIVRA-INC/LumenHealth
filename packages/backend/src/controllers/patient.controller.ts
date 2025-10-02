import { Response, Request } from 'express';
import { catchAsync } from '../utils/catch-async';
import Patient from '../models/patient.model';
import Staff from '../models/staff.model';
import { generateUniquePatientId } from '../utils/uniquePatientIdGen';
import { JWTPayload } from '../middleware';
import { PAGINATION } from '../config/pagination';
import { PatientSearchQuery } from '../types';
import { escapeRegex } from '../utils/escapeRegex';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const createPatient = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      email,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactPhone,
      address,
      emergencyContact,
    } = req.body;

    const registeredByStaffId = req.user?.id;

    if (!registeredByStaffId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const staff = await Staff.findById(registeredByStaffId);
    if (!staff || !staff.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Staff member not found or inactive',
      });
    }

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: 'Patient with this email already exists',
      });
    }

    const uniquePatientId = await generateUniquePatientId();

    const patient = new Patient({
      UPID: uniquePatientId,
      email,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactPhone,
      address,
      emergencyContact,
      registeredBy: registeredByStaffId,
    });

    await patient.save();

    await patient.populate({
      path: 'registeredBy',
      select: 'firstName lastName role email',
    });

    return res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: {
        patient,
      },
    });
  }
);

export const getPatients = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, search, firstName, lastName, uniquePatientId } =
      req.query;

    const pageNumber = Number(page) || PAGINATION.DEFAULT_PAGE;
    const limitNumber = Number(limit) || PAGINATION.DEFAULT_LIMIT;
    const skip = (pageNumber - 1) * limitNumber;

    const searchQuery: PatientSearchQuery = {};

    if (search) {
      searchQuery.$text = { $search: search as string };
    } else {
      if (firstName) {
        const escaped = escapeRegex(firstName as string);
        searchQuery.firstName = { $regex: `^${escaped}`, $options: 'i' };
      }
      if (lastName) {
        const escaped = escapeRegex(lastName as string);
        searchQuery.lastName = { $regex: `^${escaped}`, $options: 'i' };
      }
      if (uniquePatientId) {
        const escaped = escapeRegex(uniquePatientId as string);
        searchQuery.UPID = { $regex: `^${escaped}`, $options: 'i' };
      }
    }

    const [totalPatients, patients] = await Promise.all([
      Patient.countDocuments(searchQuery),
      Patient.find(searchQuery)
        .populate({
          path: 'registeredBy',
          select: 'firstName lastName role email',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalPatients / limitNumber);

    const validPageNumber = Math.min(Math.max(1, pageNumber), totalPages || 1);

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully',
      data: {
        patients,
        pagination: {
          currentPage: validPageNumber,
          totalPages,
          totalPatients,
          hasNextPage: validPageNumber < totalPages,
          hasPreviousPage: validPageNumber > 1,
          limit: limitNumber,
        },
      },
    });
  }
);

export const getPatientById = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    let patient;

    // Support both MongoDB _id and UPID for flexible patient lookup
    // Check if id is a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    if (isObjectId) {
      // Search by MongoDB _id
      patient = await Patient.findById(id)
        .populate({
          path: 'registeredBy',
          select: 'firstName lastName role email',
        })
        .lean();
    } else {
      // Search by UPID
      patient = await Patient.findOne({ UPID: id })
        .populate({
          path: 'registeredBy',
          select: 'firstName lastName role email',
        })
        .lean();
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient retrieved successfully',
      data: {
        patient,
      },
    });
  }
);

export const updatePatient = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const registeredByStaffId = req.user?.id;

    if (!registeredByStaffId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const staff = await Staff.findById(registeredByStaffId);
    if (!staff || !staff.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Staff member not found or inactive',
      });
    }

    if (updateData.email) {
      const existingPatient = await Patient.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another patient',
        });
      }
    }

    const patient = await Patient.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate({
      path: 'registeredBy',
      select: 'firstName lastName role email',
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: {
        patient,
      },
    });
  }
);
