import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('rds.amazonaws.com')
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // ──────────── Users ────────────
  const password = await bcrypt.hash('Admin@2026', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@wezete.com' },
    update: {},
    create: {
      email: 'superadmin@wezete.com',
      password,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      phone: '+251911000001',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@wezete.com' },
    update: {},
    create: {
      email: 'admin@wezete.com',
      password,
      firstName: 'Restaurant',
      lastName: 'Manager',
      role: Role.ADMIN,
      phone: '+251911000002',
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@wezete.com' },
    update: {},
    create: {
      email: 'cashier@wezete.com',
      password,
      firstName: 'Sara',
      lastName: 'Tesfaye',
      role: Role.CASHIER,
      phone: '+251911000003',
    },
  });

  const waiter = await prisma.user.upsert({
    where: { email: 'waiter@wezete.com' },
    update: {},
    create: {
      email: 'waiter@wezete.com',
      password,
      firstName: 'Abel',
      lastName: 'Kebede',
      role: Role.WAITER,
      phone: '+251911000004',
    },
  });

  const chef = await prisma.user.upsert({
    where: { email: 'chef@wezete.com' },
    update: {},
    create: {
      email: 'chef@wezete.com',
      password,
      firstName: 'Dawit',
      lastName: 'Hailu',
      role: Role.CHEF,
      phone: '+251911000005',
    },
  });

  const barista = await prisma.user.upsert({
    where: { email: 'barista@wezete.com' },
    update: {},
    create: {
      email: 'barista@wezete.com',
      password,
      firstName: 'Hanna',
      lastName: 'Girma',
      role: Role.BARISTA,
      phone: '+251911000006',
    },
  });

  const inventoryMgr = await prisma.user.upsert({
    where: { email: 'inventory@wezete.com' },
    update: {},
    create: {
      email: 'inventory@wezete.com',
      password,
      firstName: 'Meron',
      lastName: 'Alemu',
      role: Role.INVENTORY_MANAGER,
      phone: '+251911000007',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@wezete.com' },
    update: {},
    create: {
      email: 'customer@wezete.com',
      password,
      firstName: 'Yonas',
      lastName: 'Mekonnen',
      role: Role.CUSTOMER,
      phone: '+251911000008',
    },
  });

  console.log(`  Users: ${[superAdmin, admin, cashier, waiter, chef, barista, inventoryMgr, customer].length} seeded`);

  // ──────────── Categories ────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'appetizers' },
      update: {},
      create: { name: 'Appetizers', slug: 'appetizers', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: 'main-courses' },
      update: {},
      create: { name: 'Main Courses', slug: 'main-courses', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: 'ethiopian-specials' },
      update: {},
      create: { name: 'Ethiopian Specials', slug: 'ethiopian-specials', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: 'sides' },
      update: {},
      create: { name: 'Sides', slug: 'sides', sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: 'desserts' },
      update: {},
      create: { name: 'Desserts', slug: 'desserts', sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { slug: 'beverages' },
      update: {},
      create: { name: 'Beverages', slug: 'beverages', sortOrder: 6 },
    }),
    prisma.category.upsert({
      where: { slug: 'cocktails' },
      update: {},
      create: { name: 'Cocktails', slug: 'cocktails', sortOrder: 7 },
    }),
    prisma.category.upsert({
      where: { slug: 'hot-drinks' },
      update: {},
      create: { name: 'Hot Drinks', slug: 'hot-drinks', sortOrder: 8 },
    }),
  ]);

  const catMap = new Map(categories.map((c) => [c.slug, c.id]));
  console.log(`  Categories: ${categories.length} seeded`);

  // ──────────── Inventory Items ────────────
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.upsert({
      where: { name: 'Beef' },
      update: {},
      create: { name: 'Beef', unit: 'kg', quantity: 50, reorderLevel: 10, costPerUnit: 450 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Chicken' },
      update: {},
      create: { name: 'Chicken', unit: 'kg', quantity: 30, reorderLevel: 8, costPerUnit: 320 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Injera' },
      update: {},
      create: { name: 'Injera', unit: 'piece', quantity: 200, reorderLevel: 50, costPerUnit: 15 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Teff Flour' },
      update: {},
      create: { name: 'Teff Flour', unit: 'kg', quantity: 100, reorderLevel: 20, costPerUnit: 120 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Berbere Spice' },
      update: {},
      create: { name: 'Berbere Spice', unit: 'kg', quantity: 15, reorderLevel: 3, costPerUnit: 280 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Coffee Beans' },
      update: {},
      create: { name: 'Coffee Beans', unit: 'kg', quantity: 25, reorderLevel: 5, costPerUnit: 600 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Milk' },
      update: {},
      create: { name: 'Milk', unit: 'litre', quantity: 40, reorderLevel: 10, costPerUnit: 45 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Coca-Cola' },
      update: {},
      create: { name: 'Coca-Cola', unit: 'piece', quantity: 100, reorderLevel: 24, costPerUnit: 25 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Sprite' },
      update: {},
      create: { name: 'Sprite', unit: 'piece', quantity: 80, reorderLevel: 24, costPerUnit: 25 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Vodka' },
      update: {},
      create: { name: 'Vodka', unit: 'litre', quantity: 10, reorderLevel: 2, costPerUnit: 850 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Lettuce' },
      update: {},
      create: { name: 'Lettuce', unit: 'kg', quantity: 15, reorderLevel: 5, costPerUnit: 80 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: 'Tomato' },
      update: {},
      create: { name: 'Tomato', unit: 'kg', quantity: 20, reorderLevel: 5, costPerUnit: 60 },
    }),
  ]);

  console.log(`  Inventory: ${inventoryItems.length} items seeded`);

  // ──────────── Menu Items ────────────
  const menuItemsData = [
    // Appetizers
    { name: 'Sambusa (Beef)', price: 80, categoryId: catMap.get('appetizers')!, prepTime: 10, description: 'Crispy pastry filled with seasoned beef' },
    { name: 'Sambusa (Veggie)', price: 65, categoryId: catMap.get('appetizers')!, prepTime: 10, description: 'Crispy pastry filled with lentils and vegetables' },
    { name: 'Spring Rolls', price: 90, categoryId: catMap.get('appetizers')!, prepTime: 12, description: 'Golden fried spring rolls with dipping sauce' },

    // Main Courses
    { name: 'Grilled Chicken', price: 280, categoryId: catMap.get('main-courses')!, prepTime: 25, description: 'Herb-marinated grilled chicken with sides' },
    { name: 'Beef Steak', price: 450, categoryId: catMap.get('main-courses')!, prepTime: 30, description: 'Premium beef steak cooked to your preference' },
    { name: 'Fish & Chips', price: 320, categoryId: catMap.get('main-courses')!, prepTime: 20, description: 'Beer-battered fish with crispy fries' },

    // Ethiopian Specials
    { name: 'Doro Wot', price: 350, categoryId: catMap.get('ethiopian-specials')!, prepTime: 35, description: 'Classic Ethiopian chicken stew with hard-boiled egg' },
    { name: 'Tibs (Beef)', price: 380, categoryId: catMap.get('ethiopian-specials')!, prepTime: 20, description: 'Sauteed beef cubes with onions and peppers' },
    { name: 'Kitfo', price: 400, categoryId: catMap.get('ethiopian-specials')!, prepTime: 15, description: 'Ethiopian beef tartare with mitmita and kibbeh' },
    { name: 'Shiro', price: 180, categoryId: catMap.get('ethiopian-specials')!, prepTime: 15, description: 'Chickpea flour stew with berbere spice' },
    { name: 'Beyaynetu (Fasting Combo)', price: 250, categoryId: catMap.get('ethiopian-specials')!, prepTime: 20, description: 'Assorted vegan dishes on injera' },

    // Sides
    { name: 'French Fries', price: 80, categoryId: catMap.get('sides')!, prepTime: 10, description: 'Crispy golden french fries' },
    { name: 'Salad', price: 70, categoryId: catMap.get('sides')!, prepTime: 5, description: 'Fresh garden salad with vinaigrette' },
    { name: 'Extra Injera', price: 20, categoryId: catMap.get('sides')!, prepTime: 2, description: 'Additional injera bread' },

    // Desserts
    { name: 'Chocolate Cake', price: 150, categoryId: catMap.get('desserts')!, prepTime: 5, description: 'Rich chocolate cake with ganache' },
    { name: 'Ice Cream (3 scoops)', price: 120, categoryId: catMap.get('desserts')!, prepTime: 3, description: 'Choose 3 flavors: vanilla, chocolate, strawberry' },

    // Beverages
    { name: 'Coca-Cola', price: 40, categoryId: catMap.get('beverages')!, prepTime: 1, description: '330ml can' },
    { name: 'Sprite', price: 40, categoryId: catMap.get('beverages')!, prepTime: 1, description: '330ml can' },
    { name: 'Ambo Water', price: 30, categoryId: catMap.get('beverages')!, prepTime: 1, description: 'Sparkling mineral water' },
    { name: 'Fresh Juice (Mango)', price: 80, categoryId: catMap.get('beverages')!, prepTime: 5, description: 'Freshly squeezed mango juice' },
    { name: 'Fresh Juice (Avocado)', price: 90, categoryId: catMap.get('beverages')!, prepTime: 5, description: 'Creamy avocado juice with lime' },

    // Cocktails
    { name: 'Mojito', price: 250, categoryId: catMap.get('cocktails')!, prepTime: 5, description: 'Classic mojito with fresh mint' },
    { name: 'Gin & Tonic', price: 220, categoryId: catMap.get('cocktails')!, prepTime: 3, description: 'Premium gin with tonic water' },
    { name: 'Cosmopolitan', price: 280, categoryId: catMap.get('cocktails')!, prepTime: 5, description: 'Vodka, triple sec, cranberry, lime' },

    // Hot Drinks
    { name: 'Ethiopian Coffee (Buna)', price: 50, categoryId: catMap.get('hot-drinks')!, prepTime: 8, description: 'Traditional Ethiopian coffee ceremony cup' },
    { name: 'Macchiato', price: 60, categoryId: catMap.get('hot-drinks')!, prepTime: 4, description: 'Espresso with a dash of steamed milk' },
    { name: 'Cappuccino', price: 80, categoryId: catMap.get('hot-drinks')!, prepTime: 5, description: 'Espresso with steamed milk foam' },
    { name: 'Tea (Shai)', price: 35, categoryId: catMap.get('hot-drinks')!, prepTime: 3, description: 'Spiced Ethiopian tea' },
  ];

  let menuCount = 0;
  for (const item of menuItemsData) {
    await prisma.menuItem.upsert({
      where: {
        id: undefined as any, // force create — upsert by unique composite not available, so we use findFirst
      },
      update: {},
      create: item,
    }).catch(async () => {
      // If upsert fails (no unique match), try findFirst + create
      const existing = await prisma.menuItem.findFirst({
        where: { name: item.name, categoryId: item.categoryId },
      });
      if (!existing) {
        await prisma.menuItem.create({ data: item });
      }
    });
    menuCount++;
  }

  console.log(`  Menu items: ${menuCount} seeded`);
  console.log('Seed complete!');
  console.log('');
  console.log('Login credentials (all accounts):');
  console.log('  Password: Admin@2026');
  console.log('  Accounts:');
  console.log('    superadmin@wezete.com  (Super Admin)');
  console.log('    admin@wezete.com       (Admin/Manager)');
  console.log('    cashier@wezete.com     (Cashier)');
  console.log('    waiter@wezete.com      (Waiter)');
  console.log('    chef@wezete.com        (Chef)');
  console.log('    barista@wezete.com     (Barista)');
  console.log('    inventory@wezete.com   (Inventory Manager)');
  console.log('    customer@wezete.com    (Customer)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
