import { UserPermissionRole } from "@prisma/client";

export const isAdminGuard = async (req: NextApiRequest) => {
  const { userId, prisma } = req;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === UserPermissionRole.ADMIN;
};
