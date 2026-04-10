import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';
import { MenuService } from './menu.service';
import { CreateCategoryDto, CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateCategoryDto, UpdateMenuItemDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ────────────────────────── Categories ──────────────────────────

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @Get('categories')
  findAllCategories() {
    return this.menuService.findAllCategories();
  }

  @Get('categories/:id')
  findOneCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOneCategory(id);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.removeCategory(id);
  }

  // ────────────────────────── Menu Items ──────────────────────────

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @Get('items')
  findAllMenuItems() {
    return this.menuService.findAllMenuItems();
  }

  @Get('items/:id')
  findOneMenuItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOneMenuItem(id);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  updateMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateMenuItem(id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLE_LEVEL.ADMIN)
  removeMenuItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.removeMenuItem(id);
  }
}
