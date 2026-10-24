import "server-only";
import { db } from "../db";
import { UsersService } from "../services/users";
import { AuthService } from "./auth-service";
import { createSession } from "./session";

// Module-level so concurrent requests in one instance share a refresh.
const users = new UsersService(db);
export const authService = new AuthService(users);
export const session = createSession({ auth: authService, users });
