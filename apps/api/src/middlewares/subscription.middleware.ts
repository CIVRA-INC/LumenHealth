import { RequestHandler } from "express";
import { verifyAccessToken } from "../modules/auth/token.service";
import { ClinicModel } from "../modules/clinics/models/clinic.model";

const EXEMPT_MUTATION_PREFIXES = ["/api/v1/auth", "/api/v1/payments", "/api/v1/billing"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getTokenFromAuthorizationHeader = (authorization: unknown): string | null => {
  if (typeof authorization !== "string") {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const isExemptPath = (path: string) =>
  EXEMPT_MUTATION_PREFIXES.some((prefix) => path.startsWith(prefix));

export const requireActiveSubscription: RequestHandler = async (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const requestPath = req.path || req.originalUrl || "";
  if (isExemptPath(requestPath)) {
    return next();
  }

  if (!req.user) {
    const token = getTokenFromAuthorizationHeader(req.headers.authorization);
    if (token) {
      const decodedUser = verifyAccessToken(token);
      if (decodedUser) {
        req.user = decodedUser;
      }
    }
  }

  if (!req.user?.clinicId) {
    return next();
  }

  try {
    const clinic = await ClinicModel.findById(req.user.clinicId)
      .select({ subscriptionExpiryDate: 1 })
      .lean();

    if (!clinic?.subscriptionExpiryDate) {
      return next();
    }

    const expiryTime = new Date(clinic.subscriptionExpiryDate).getTime();
    if (Date.now() > expiryTime) {
      return res.status(402).json({
        error: "PaymentRequired",
        message:
          "Subscription expired. Write access is disabled. Please renew billing to continue.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
