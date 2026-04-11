import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(ROLE_LEVEL.ADMIN)
  getAll() {
    return this.settingsService.getAll();
  }

  @Patch()
  @Roles(ROLE_LEVEL.ADMIN)
  update(@Body() updates: Record<string, string>) {
    return this.settingsService.update(updates);
  }
}
