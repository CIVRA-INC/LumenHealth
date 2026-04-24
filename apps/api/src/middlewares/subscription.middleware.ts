import { RequestHandler } from "express";
import { paymentRequiredProblem } from "../core/problem";
import { ClinicModel } from "../modules/clinics/models/clinic.model";
import { getRequestContext } from "./request-context.middleware";

const EXEMPT_MUTATION_PREFIXES = ["/api/v1/auth", "/api/v1/payments", "/api/v1/billing"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

  const context = getRequestContext(req);

  if (!req.user?.clinicId) {
    return next();
  }

  try {
    const clinic = await ClinicModel.findById(req.user.clinicId)
      .select({ subscriptionExpiryDate: 1 })
      .lean();

    if (!clinic?.subscriptionExpiryDate) {
      context.subscription.status = "active";
      return next();
    }

    const expiryTime = new Date(clinic.subscriptionExpiryDate).getTime();
    if (Date.now() > expiryTime) {
      context.subscription.status = "expired";
      return next(paymentRequiredProblem());
    }

    context.subscription.status = "active";
    return next();
  } catch (error) {
    return next(error);
  }
};
