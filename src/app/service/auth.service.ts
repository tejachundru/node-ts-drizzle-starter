import env from "@/config/env";
import { hashing } from "@/config/hashing";
import { logger } from "@/config/pino";
import ErrorResponse from "@/core/modules/response/ErrorResponse";
import { sendEmail } from "@/core/send-mail";
import db from "@/db";
import { userTable } from "@/db/schema";
import { useToken } from "@/hooks/useToken";
import { eq, and } from "drizzle-orm";
import loginSchema from "../schema/auth.schema";
import userSchema from "../schema/user.schema";

export default class AuthService {
  private generateAuthToken(user: any, role: "user") {
    const tokenValue = {
      email: user.email ?? "",
      userId: user.id,
      role,
    };

    const secretKey = env.JWT_SECRET_ACCESS_TOKEN;
    const { token, expiresIn } = useToken.generate({
      value: tokenValue,
      expires: "1d",
      secretKey,
    });

    return { token, expiresIn };
  }

  // User login
  public async userLogin(email: string, password: string) {
    const value = loginSchema.parse({ email, password });

    // Get user from database
    const getUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, value.email))
      .limit(1);

    if (!getUser || getUser.length === 0) {
      throw new ErrorResponse.NotFound("Account not found or not registered");
    }

    const user = getUser[0];

    // Check if user is active
    if (!user.isActive) {
      throw new ErrorResponse.BadRequest("Your account is not active");
    }

    // Verify password
    const matchPassword = await hashing.verify(
      user.password ?? "",
      value.password
    );
    if (!matchPassword) {
      logger.warn(`Failed login attempt for user: ${user.email}`);
      throw new ErrorResponse.BadRequest("Invalid username or password");
    }

    const { token, expiresIn } = this.generateAuthToken(user, "user");

    logger.info(`User logged in: ${user.email}`);

    return {
      token,
      user: user.email,
      name: user.name,
      userId: user.id,
      expiresIn,
    };
  }

  // Validate reset token
  private async validateResetToken(
    email: string,
    token: string,
    table: typeof userTable
  ) {
    // Check if token is valid
    const user = await db
      .select({ email: table.email, passwordToken: table.passwordToken })
      .from(table)
      .where(eq(table.email, email))
      .limit(1)
      .then((result) => result[0]);

    if (!user || !user.passwordToken || user.passwordToken !== token) {
      return false;
    }

    // Verify token expiry and validity
    const tokenValidation = await useToken.verify({
      secretKey: env.JWT_SECRET_ACCESS_TOKEN,
      token,
    });

    return tokenValidation !== null;
  }

  // Send confirmation email after password reset
  private async sendConfirmationEmail(email: string) {
    try {
      await sendEmail({
        to: email,
        subject: "Password reset successfully",
        text: `Your password has been reset successfully. If you did not request this change, please contact us immediately.`,
      });
    } catch (error) {
      logger.error("Error sending email confirmation: ", error);
      throw new ErrorResponse.InternalServer(
        "Failed to send confirmation email."
      );
    }
  }

  // Reset password
  public async resetPassword(email: string, password: string, token: string) {
    // Validate user type
    const table = userTable;

    const isValidToken = await this.validateResetToken(email, token, table);
    if (!isValidToken) {
      throw new ErrorResponse.BadRequest("Invalid or expired token");
    }

    // Hash new password
    const hashedPassword = await hashing.hash(password);

    // Update password and reset token
    await db
      .update(table)
      .set({
        password: hashedPassword,
        isEmailVerified: true,
        passwordToken: null,
      })
      .where(eq(table.email, email));

    // Log the password reset event
    logger.info(
      `Password reset for user with email: ${email} at ${new Date().toISOString()}`
    );

    // Send confirmation email
    await this.sendConfirmationEmail(email);

    return { message: "Password reset successfully", email };
  }

  public async getUserByEmail(email: string) {
    const data = await db.query.userTable.findFirst({
      where: and(
        eq(userTable.email, email), // First condition: organizationName
        eq(userTable.isDeleted, false) // Second condition: isDeleted
      ),
    });
    return data;
  }

  // Create a new user
  public async createUser(data: typeof userTable.$inferInsert) {
    // Validate user type
    const validatedData = userSchema.insert.parse(data);

    // Check if a User already exists for the given Users Table
    const existingUser = await this.getUserByEmail(
      validatedData.email as string
    );

    if (existingUser) {
      throw new ErrorResponse.BadRequest("User already exists");
    }

    // Hash new password
    const password = data?.password;
    const hashedPassword = await hashing.hash(password as string);

    const userData: typeof userTable.$inferInsert = {
      ...validatedData,
      password: hashedPassword,
      isEmailVerified: false, // Ensure email is not verified initially
    };

    // Insert user
    const newUser = await db
      .insert(userTable)
      .values(userData as typeof userTable.$inferInsert)
      .returning();

    // Send verification email
    await this.sendVerificationEmail(validatedData.email as string);

    return {
      message:
        "User registered successfully. Please check your email to verify your account.",
      userId: newUser[0].id,
    };
  }

  // Request password reset
  public async requestPasswordReset(email: string) {
    // Get user from database
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new ErrorResponse.NotFound("Account not found");
    }

    // Generate password reset token
    const secretKey = env.JWT_SECRET_ACCESS_TOKEN;
    const { token } = useToken.generate({
      value: { email: user.email, type: "password-reset" },
      expires: "1h", // Short expiry for security
      secretKey,
    });

    // Update user with password reset token
    await db
      .update(userTable)
      .set({ passwordToken: token })
      .where(eq(userTable.email, email));

    // Send password reset email
    try {
      await sendEmail({
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Please use the following token to reset your password: ${token}\n\nIf you did not request this, please ignore this email.`,
      });
    } catch (error) {
      logger.error("Error sending password reset email: ", error);
      throw new ErrorResponse.InternalServer(
        "Failed to send password reset email."
      );
    }

    return { message: "Password reset instructions sent to your email" };
  }

  // Send verification email to newly registered user
  public async sendVerificationEmail(email: string) {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new ErrorResponse.NotFound("User not found");
    }

    // Generate verification token
    const secretKey = env.JWT_SECRET_ACCESS_TOKEN;
    const { token } = useToken.generate({
      value: { email, type: "email-verification" },
      expires: "1d",
      secretKey,
    });

    // Update user with verification token
    await db
      .update(userTable)
      .set({ passwordToken: token })
      .where(eq(userTable.email, email));

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email",
        text: `Please verify your email using the following token: ${token}\n\nThis token will expire in 24 hours.`,
      });
    } catch (error) {
      logger.error("Error sending verification email: ", error);
      throw new ErrorResponse.InternalServer(
        "Failed to send verification email."
      );
    }

    return { message: "Verification email sent" };
  }
}
