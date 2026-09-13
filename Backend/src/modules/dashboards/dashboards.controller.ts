import { Request, Response, NextFunction } from "express";
import { dashboardsService } from "./dashboards.service";
import { ApiError } from "../../utils/apiError";

export const getNationalDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardsService.getNationalDashboard();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getStateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stateId = (req.params.stateId as string) || "MH";

    // Jurisdiction enforcement: State authority restricted to their authorized state
    if (req.user?.role === "STATE_AUTHORITY" && req.user.state) {
      if (req.user.state.toLowerCase() !== stateId.toLowerCase()) {
        return next(new ApiError(403, `Forbidden: Cannot access records outside state '${req.user.state}'`));
      }
    }

    const data = await dashboardsService.getStateDashboard(stateId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDistrictDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const districtId = (req.params.districtId as string) || "pune";

    // Jurisdiction enforcement: District authority restricted to their authorized district
    if (req.user?.role === "DISTRICT_AUTHORITY" && req.user.district) {
      if (req.user.district.toLowerCase() !== districtId.toLowerCase()) {
        return next(new ApiError(403, `Forbidden: Cannot access records outside district '${req.user.district}'`));
      }
    }

    const data = await dashboardsService.getDistrictDashboard(districtId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

