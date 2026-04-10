import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto, DecideApprovalDto } from './dto/create-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLE_LEVEL } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @Roles(ROLE_LEVEL.WAITER)
  create(
    @Body() dto: CreateApprovalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.approvalsService.create(dto, userId);
  }

  @Get()
  @Roles(ROLE_LEVEL.ADMIN)
  findAll(@Query('status') status?: ApprovalStatus) {
    return this.approvalsService.findAll(status);
  }

  @Get(':id')
  @Roles(ROLE_LEVEL.WAITER)
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  @Patch(':id/decide')
  @Roles(ROLE_LEVEL.ADMIN)
  decide(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.approvalsService.decide(id, dto.status, userId);
  }
}
