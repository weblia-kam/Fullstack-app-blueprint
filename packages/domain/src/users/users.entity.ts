export type User = {
  id: string;
  email: string;
  name?: string;
  role: "ADMIN" | "USER";
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: Date | null;
    displayName?: string | null;
  };
};
