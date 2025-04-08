import HttpResponse from "@/core/modules/response/HttpResponse";
import AuthService from "@/app/service/auth.service";
import apiRoutes from "@/app/routes/api-route";
import expressAsyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";
import { SessionService } from "../service/session.service";
import { userSessionTable } from "@/db/schema";
import authorization from "@/middleware/authorization";

const route = apiRoutes;
const routePath = `/auth`;
const authService = new AuthService();
const sessionService = new SessionService();

route.post(
  `${routePath}/user-login`,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const login = await authService.userLogin(email, password);
    const httpResponse = HttpResponse.get({
      data: login,
    });
    // create session
    await sessionService.createOrUpdateSession(
      userSessionTable,
      login.userId,
      login.token
    );
    res.status(200).json(httpResponse);
  })
);

route.post(
  `${routePath}/forgot-password`,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    const httpResponse = HttpResponse.get({
      data: result,
    });
    res.status(200).json(httpResponse);
  })
);

route.post(
  `${routePath}/reset-password`,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { email, password, token } = req.body;
    const resetPassword = await authService.resetPassword(
      email,
      password,
      token
    );
    const httpResponse = HttpResponse.get({
      data: resetPassword,
    });
    res.status(200).json(httpResponse);
  })
);

route.post(
  `${routePath}/logout`,
  authorization,
  expressAsyncHandler(async (req: Request, res: Response) => {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      await sessionService.deleteSession(userSessionTable, token);
    }

    const httpResponse = HttpResponse.get({
      data: { message: "Logged out successfully" },
    });
    res.status(200).json(httpResponse);
  })
);

route.post(
  `${routePath}/user-registration`,
  authorization,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const body = req.getBody();
    const user = await authService.createUser(body);
    const httpResponse = HttpResponse.created(user);
    res.status(201).json(httpResponse);
  })
);
