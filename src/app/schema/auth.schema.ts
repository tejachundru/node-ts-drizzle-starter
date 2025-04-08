import * as z from "zod";

// Basic login schema
const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(2, "Email can't be empty"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// Add refinement to prevent using email as password
loginSchema.refine(
  (data) => {
    return !data.password.includes(data.email);
  },
  {
    message: "Password cannot contain the email address",
    path: ["password"],
  }
);

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Password reset schema
export const passwordResetSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
      ),
    confirmPassword: z.string().min(8, "Confirm password is required"),
    token: z.string().min(1, "Reset token is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Logout schema (optional, for additional validation)
export const logoutSchema = z.object({
  token: z.string().optional(),
});

export default loginSchema;
export const authSchemas = {
  login: loginSchema,
  emailVerification: emailVerificationSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordReset: passwordResetSchema,
  logout: logoutSchema,
};
