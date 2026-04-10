import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Minimum role level required to access the route.
 * 1=CUSTOMER, 2=BARISTA, 3=CHEF, 4=WAITER, 5=CASHIER,
 * 6=INVENTORY_MANAGER, 7=ADMIN, 8=SUPER_ADMIN
 */
export const Roles = (minLevel: number) => SetMetadata(ROLES_KEY, minLevel);
