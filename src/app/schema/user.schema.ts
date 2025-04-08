import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { userTable } from "@/db/schema";

// Base user schema with validation rules
const userBaseSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .min(5, "Email must be at least 5 characters long")
    .max(100, "Email cannot exceed 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(255, "Password cannot exceed 255 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/,
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
    )
    .optional(),
  passwordToken: z.string().max(255).nullable().optional(),
  isActive: z.boolean().default(true),
  isEmailVerified: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
});

// Schema for creating a new user
export const insertUserSchema = createInsertSchema(userTable, {
  email: (schema) => schema.email("Invalid email format"),
  name: (schema) => schema.min(2, "Name is too short"),
})
  .extend({
    // Add custom validation for password
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
      ),
    // Add any additional fields not in the database schema
    confirmPassword: z.string().min(8, "Confirm password is required").max(255),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Schema for selecting user data (typically used for responses)
export const selectUserSchema = createSelectSchema(userTable);

// Schema for updating an existing user
export const updateUserSchema = userBaseSchema.partial();

// Schema for user profile data (limited fields for security/privacy)
export const userProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
});

// Schema for password change
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Combine schemas for export
const userSchema = {
  base: userBaseSchema,
  insert: insertUserSchema,
  select: selectUserSchema,
  update: updateUserSchema,
  profile: userProfileSchema,
  passwordChange: passwordChangeSchema,
};

export default userSchema;
